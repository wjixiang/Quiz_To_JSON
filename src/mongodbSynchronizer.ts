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
    question: z.string(),
    options: z.array(optionSchema),
    answer: z.enum(["A", "B", "C", "D", "E"]),
    analysis: analysisSchema
});

// 定义 A2 的 Zod schema
const A2Schema = z.object({
    type: z.literal("A2"),
    question: z.string(),
    options: z.array(optionSchema),
    answer: z.enum(["A", "B", "C", "D", "E"]),
    analysis: analysisSchema
});

// 定义 A3 的 Zod schema
const A3Schema = z.object({
    type: z.literal("A3"),
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
    question: z.string(),
    options: z.array(optionSchema),
    answer: z.array(z.enum(["A", "B", "C", "D", "E"])),
    analysis: analysisSchema
});

// 定义 B 的 Zod schema
const BSchema = z.object({
    type: z.literal("B"),
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


    start = async () => {  
        const abnormalFiles = []
        try {  
            await this.initDatabase();  
            const files = await fs.readdir(this.local_json_quiz_dir);  

            // 初始化进度条  
            const bar = new ProgressBar('同步进度 [:bar] :current/:total (:percent) - :eta秒剩余', {  
                total: files.length,  
                width: 40,  
                complete: '=',  
                incomplete: ' ',  
                renderThrottle: 100  
            });  

            let completed = 0;  
            const limiter = new Bottleneck({  
                maxConcurrent: 50,  
                minTime: 100  
            });  

            const promises = files.map(file =>  
                limiter.schedule(async () => {  
                    try {  
                        const quizdata = await this.loadJSON(file);  
                        const quiz = this.convert(quizdata);  
                        if (quiz) {  
                            try {
                                this.sync(quiz);  
                            } catch (error) {
                                console.log(`sync error:`, error)
                            }
                        }  
                        completed++;  
                        bar.tick();  
                    } catch (error) {  
                        console.error(`Error processing file ${file}:`, error);  
                    }  
                })  
            );  

            await Promise.all(promises);  
            
            console.log('\n同步完成！');  
            await mongoose.connection.close();  
            console.log('数据库连接已关闭');  
        } catch (error) {  
            console.error('Error:', error);  
            await mongoose.connection.close();  
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