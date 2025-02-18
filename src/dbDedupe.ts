import mongoose from 'mongoose';  
import modal from './types/quizModal';

// 连接MongoDB  
async function connectDB() {  
    try {  
        await mongoose.connect('mongodb://localhost:27017/QuizBank');  
        console.log('Connected to MongoDB');  
    } catch (error) {  
        console.error('Failed to connect to MongoDB:', error);  
        process.exit(1);  
    }  
}  

// 用于生成题目指纹的接口  
interface QuestionFingerprint {  
    type: string;  
    question?: string;  
    mainQuestion?: string;  
    questions?: any[];  
    options?: any[];  
}  

// 生成题目指纹的函数  
function generateFingerprint(doc: QuestionFingerprint): string {  
    let fingerprintObj: any = {  
        type: doc.type,  
    };  

    // 根据不同题型添加关键字段  
    if (doc.type === 'A1' || doc.type === 'A2' || doc.type === 'X') {  
        fingerprintObj.question = doc.question;  
        fingerprintObj.options = doc.options?.map(opt => ({  
            oid: opt.oid,  
            text: opt.text  
        }));  
    }  

    // 将对象转换为规范化的字符串  
    return JSON.stringify(fingerprintObj);  
}  

// 处理单个集合的重复记录  
async function removeDuplicatesFromCollection(Model: mongoose.Model<any>, type: string) {  
    try {  
        console.log(`Processing ${type} collection...`);  
        
        // 获取所有记录  
        const documents = await Model.find({});  
        console.log(`Found ${documents.length} documents in ${type}`);  

        // 用于存储指纹和文档ID的映射  
        const fingerprintMap = new Map<string, mongoose.Types.ObjectId[]>();  

        // 生成每个文档的指纹并分组  
        documents.forEach(doc => {  
            const fingerprint = generateFingerprint(doc);  
            const existing = fingerprintMap.get(fingerprint) || [];  
            existing.push(doc._id);  
            fingerprintMap.set(fingerprint, existing);  
        });  

        // 找出需要删除的文档ID  
        const toDelete: mongoose.Types.ObjectId[] = [];  
        fingerprintMap.forEach((ids) => {  
            if (ids.length > 1) {  
                // 保留第一个文档，删除其余重复的  
                toDelete.push(...ids.slice(1));  
            }  
        });  

        if (toDelete.length > 0) {  
            // 删除重复文档  
            const result = await Model.deleteMany({ _id: { $in: toDelete } });  
            console.log(`Deleted ${result.deletedCount} duplicate documents from ${type}`);  
        } else {  
            console.log(`No duplicates found in ${type}`);  
        }  
    } catch (error) {  
        console.error(`Error processing ${type}:`, error);  
    }  
}  

// 主函数  
export async function removeDuplicates() {  
    try {  
        await connectDB();  

        // 依次处理每个集合  
        await removeDuplicatesFromCollection(modal.a1, 'A1');  
        await removeDuplicatesFromCollection(modal.a2, 'A2');  
        await removeDuplicatesFromCollection(modal.a3, 'A3');  
        await removeDuplicatesFromCollection(modal.b, 'B');  
        await removeDuplicatesFromCollection(modal.x, 'X');  

        console.log('Finished removing duplicates from all collections');  
    } catch (error) {  
        console.error('Error:', error);  
    } finally {  
        await mongoose.connection.close();  
        console.log('Disconnected from MongoDB');  
    }  
}  
