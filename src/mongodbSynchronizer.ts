import { Db, MongoClient } from "mongodb";
import * as fs from 'fs/promises';
import path from "path";
import Bottleneck from "bottleneck";
import { A1, A2, A3, B, oid, X } from './types/quizData.types';
import ProgressBar from 'progress';
import mongoose from "mongoose";
import modal from "./types/quizModal";

import { z } from 'zod';

// 定义选项的 Zod schema
const optionSchema = z.object({
    oid: z.enum(["A", "B", "C", "D", "E"]),
    text: z.string()
});

// 定义分析的 Zod schema
const analysisSchema = z.object({
    point: z.string().nullable(),
    discuss: z.string().nullable(),
    link: z.array(z.string()).default([])
});

// 定义 A1 的 Zod schema
const A1Schema = z.object({
    type: z.literal("A1"),
    class: z.string(),
    question: z.string(),
    options: z.array(optionSchema),
    answer: z.enum(["A", "B", "C", "D", "E"]),
    analysis: analysisSchema
});

// 定义 A2 的 Zod schema
const A2Schema = z.object({
    type: z.literal("A2"),
    class: z.string(),
    question: z.string(),
    options: z.array(optionSchema),
    answer: z.enum(["A", "B", "C", "D", "E"]),
    analysis: analysisSchema
});

// 定义 A3 的 Zod schema
const A3Schema = z.object({
    type: z.literal("A3"),
    class: z.string(),
    mainQuestion: z.string(),
    subQuizs: z.array(z.object({
        subQuizId: z.number(),
        question: z.string(),
        options: z.array(optionSchema),
        answer: z.enum(["A", "B", "C", "D", "E"])
    })),
    analysis: analysisSchema
});

// 定义 X 的 Zod schema
const XSchema = z.object({
    type: z.literal("X"),
    class: z.string(),
    question: z.string(),
    options: z.array(optionSchema),
    answer: z.array(z.enum(["A", "B", "C", "D", "E"])),
    analysis: analysisSchema
});

// 定义 B 的 Zod schema
const BSchema = z.object({
    type: z.literal("B"),
    class: z.string(),
    questions: z.array(z.object({
        questionId: z.number(),
        questionText: z.string(),
        answer: z.enum(["A", "B", "C", "D", "E"])
    })),
    options: z.array(optionSchema),
    analysis: analysisSchema
});


interface quizData {
    name: string,
    cls: string,
    unit: string,
    mode: string,
    test: string,
    option: string[],
    answer: string,
    point: string,
    discuss: string
}




export class synchronizer {
    dbURL = "mongodb://localhost:27017/QuizBank";
    databaseName = "QuizBank";
    local_json_quiz_dir = "./tests_json_vault";
    
    

    initDatabase = async () => {
        try {
            await mongoose.connect(this.dbURL)
        } catch (error) {
            throw(error)
        }
    }

    loadJSON = async(fileName: string): Promise<quizData> => {
        const filePath = path.join(this.local_json_quiz_dir, fileName);

        return new Promise((resolve,reject)=> {
            fs.readFile(filePath, "utf-8")
            .then((content) => {
                try {
                    resolve(JSON.parse(content))
                    
                } catch (error) {
                    console.log(error)
                    reject(error)
                }
            })
        })
    }


        // 批量处理大小  
        private readonly BATCH_SIZE = 1000;  
        // 并发数  
        private readonly CONCURRENT_BATCHES = 5;  
    
        start = async () => {  
            const abnormalFiles: { file: string; error: string }[] = [];  
            try {  
                await this.initDatabase();  
    
                // 只处理 JSON 文件  
                const files = (await fs.readdir(this.local_json_quiz_dir))  
                    .filter(file => file.endsWith('.json'));  
    
                // 初始化进度条  
                const bar = new ProgressBar('同步进度 [:bar] :current/:total (:percent) - :eta秒剩余', {  
                    total: files.length,  
                    width: 40,  
                    complete: '=',  
                    incomplete: ' ',  
                    renderThrottle: 100  
                });  
    
                // 将文件分成批次  
                const batches = this.chunks(files, this.BATCH_SIZE);  
    
                // 使用 Bottleneck 限制并发  
                const limiter = new Bottleneck({  
                    maxConcurrent: this.CONCURRENT_BATCHES,  
                    minTime: 1000 // 每批次最小间隔时间  
                });  
    
                // 处理每个批次  
                for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {  
                    const batch = batches[batchIndex];  
                    await limiter.schedule(async () => {  
                        const batchData = {  
                            a1: [] as A1[],  
                            a2: [] as A2[],  
                            a3: [] as A3[],  
                            b: [] as B[],  
                            x: [] as X[]  
                        };  
    
                        // 处理批次中的每个文件  
                        for (const file of batch) {  
                            try {  
                                const quizdata = await this.loadJSON(file);  
                                const quiz = this.convert(quizdata);  
                                if (quiz) {  
                                    // 按类型分组  
                                    switch (quiz.type) {  
                                        case 'A1':  
                                            batchData.a1.push(quiz);  
                                            break;  
                                        case 'A2':  
                                            batchData.a2.push(quiz);  
                                            break;  
                                        case 'A3':  
                                            batchData.a3.push(quiz);  
                                            break;  
                                        case 'B':  
                                            batchData.b.push(quiz);  
                                            break;  
                                        case 'X':  
                                            batchData.x.push(quiz);  
                                            break;  
                                    }  
                                }  
                                bar.tick();  
                            } catch (error) {  
                                abnormalFiles.push({  
                                    file,  
                                    error: error instanceof Error ? error.message : String(error)  
                                });  
                            }  
                        }  
    
                        // 批量插入数据  
                        await this.batchSync(batchData);  
                    });  
                }  
    
                console.log('\n同步完成！');  
                if (abnormalFiles.length > 0) {  
                    console.log('处理失败的文件：', abnormalFiles);  
                }  
                await mongoose.connection.close();  
                console.log('数据库连接已关闭');  
            } catch (error) {  
                console.error('Error:', error);  
                await mongoose.connection.close();  
            }  
        };  
    
        // 辅助方法：将数组分成小块  
        private chunks<T>(array: T[], size: number): T[][] {  
            const chunks: T[][] = [];  
            for (let i = 0; i < array.length; i += size) {  
                chunks.push(array.slice(i, i + size));  
            }  
            return chunks;  
        }  
    
        // 批量同步数据到数据库  
        private async batchSync(batchData: {  
            a1: A1[];  
            a2: A2[];  
            a3: A3[];  
            b: B[];  
            x: X[];  
        }) {  
            const operations = [];  
    
            if (batchData.a1.length > 0) {  
                operations.push(modal.a1.insertMany(batchData.a1, { ordered: false }));  
            }  
            if (batchData.a2.length > 0) {  
                operations.push(modal.a2.insertMany(batchData.a2, { ordered: false }));  
            }  
            if (batchData.a3.length > 0) {  
                operations.push(modal.a3.insertMany(batchData.a3, { ordered: false }));  
            }  
            if (batchData.b.length > 0) {  
                operations.push(modal.b.insertMany(batchData.b, { ordered: false }));  
            }  
            if (batchData.x.length > 0) {  
                operations.push(modal.x.insertMany(batchData.x, { ordered: false }));  
            }  
    
            try {  
                await Promise.all(operations);  
            } catch (error) {  
                console.error('Batch sync error:', error);  
                throw error;  
            }  
        }    


    oidConvert = (index: number) => {
        switch (index) {
            case 0:
                return "A"
            case 1:
                return "B"
            case 2:
                return "C"
            case 3:
                return "D"
            case 4:
                return "E"
            default:
                throw new Error("选项数目超出限制")
        }
    }

    convert = (quizdata: quizData): A1 | A2 | A3 | B | X | null => {
        try {
            let quiz;
            switch (quizdata.mode.replace("型题", "")) {
                case "A1":
                    quiz = {
                        type: "A1",
                        class: quizdata.cls,
                        unit: quizdata.unit,
                        tags: [],
                        question: quizdata.test,
                        options: quizdata.option.map((value, index) => ({
                            oid: this.oidConvert(index),
                            text: value
                        })),
                        answer: quizdata.answer.replace("答","").replace("案","").replace("：","").replace(":","") as oid,
                        analysis: {
                            point: quizdata.point,
                            discuss: quizdata.discuss,
                            link: []
                        }
                    };
                    A1Schema.parse(quiz); // 验证 A1 数据
                    return quiz as A1;
    
                case "A2":
                    quiz = {
                        type: "A2",
                        class: quizdata.cls,
                        unit: quizdata.unit,
                        tags: [],
                        question: quizdata.test,
                        options: quizdata.option.map((value, index) => ({
                            oid: this.oidConvert(index),
                            text: value
                        })),
                        answer: quizdata.answer.replace("答","").replace("案","").replace("：","").replace(":","") as oid,
                        analysis: {
                            point: quizdata.point,
                            discuss: quizdata.discuss,
                            link: []
                        }
                    };
                    A2Schema.parse(quiz); // 验证 A2 数据
                    return quiz as A2;
    
                case "A3":
                    // 处理 A3 型题
                    return null;
    
                case "B":
                    // 处理 B 型题
                    return null;
    
                case "X":
                    quiz = {
                        type: "X",
                        class: quizdata.cls,
                        unit: quizdata.unit,
                        tags: [],
                        question: quizdata.test,
                        options: quizdata.option.map((value, index) => ({
                            oid: this.oidConvert(index),
                            text: value
                        })),
                        answer: quizdata.answer.replace("答","").replace("案","").replace("：","").replace(":","").split("").map(value => value as oid),
                        analysis: {
                            point: quizdata.point,
                            discuss: quizdata.discuss,
                            link: []
                        }
                    };
                    XSchema.parse(quiz); // 验证 X 数据
                    return quiz as X;
    
                default:
                    return null;
            }
        } catch (error) {
            console.error(`Convert data ${quizdata} failed:`, error);
            return null;
        }
    };
    

    sync = (quiz: A1|A2|A3|B|X) => {
        try {
            switch (quiz.type) {
                case "A1":
                    modal.a1.create(quiz)
                    break;
                case "A2":
                    modal.a2.create(quiz)
                    break;
                case "A3":
                    modal.a3.create(quiz)
                    break
                case "B":
                    modal.b.create(quiz)
                    break
                case "X":
                    modal.x.create(quiz)
                    break
                default:
                    break;
            }
        } catch (error) {
            throw error
        }
       

    }
}

new synchronizer().start()