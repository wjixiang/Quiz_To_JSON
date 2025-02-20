import { AnyBulkWriteOperation, Document, MongoClient, ObjectId, Filter, UpdateFilter } from 'mongodb';  

async function processQuestionsWithYearExtraction() {  
  // 连接MongoDB  
  const client = new MongoClient('mongodb://localhost:27017/');  

  try {  
    await client.connect();  
    const database = client.db('QuizBank');  
    const collection = database.collection('xes');  

    // 使用正则表达式查询以4个数字开头的question字段  
    const query = {   
      question: {   
        $regex: /^\d{4}/   
      }   
    };  

    // 查询并转换为数组  
    const results = await collection.find(query).toArray();  

    // 批量更新操作  
    const bulkOperations = results.map(record => {  
      // 从question中提取前4位数字  
      const yearMatch = record.question.match(/^(\d{4})/);  
      
      if (yearMatch) {  
        return {  
          updateOne: {  
            filter: { _id: record._id },  
            update: {   
              $set: {   
                extractedYear: parseInt(yearMatch[1]),  
                processedAt: new Date()   
              }   
            }  
          }  
        };  
      }  
      
      return null;  
    }).filter(op => op !== null);  

    // 执行批量更新  
    if (bulkOperations.length > 0) {  
      const updateResult = await collection.bulkWrite(bulkOperations);  
      
      console.log('匹配的记录:', results);  
      console.log('总记录数:', results.length);  
      console.log('成功更新的记录数:', updateResult.modifiedCount);  
    }  

  } catch (error) {  
    console.error('处理出错:', error);  
  } finally {  
    await client.close();  
  }  
}  




async function updateSourceBasedOnExtractedYear() {  
  // 连接MongoDB  
  const client = new MongoClient('mongodb://localhost:27017/');  

  try {  
    await client.connect();  
    const database = client.db('QuizBank');  
    const collection = database.collection('a2');  

    // 明确指定批量更新操作的类型  
    const bulkOperations: Array<{  
      updateOne: {  
        filter: { _id: ObjectId },  
        update: { $set: { source: string } }  
      }  
    }> = [];  

    // 查询所有记录  
    const cursor = collection.find({});  

    // 遍历所有记录  
    await cursor.forEach(record => {  
      // 判断是否有extractedYear字段  
      const sourceValue = record.extractedYear ? "西综真题" : "本科生题库";  
      
      bulkOperations.push({  
        updateOne: {  
          filter: { _id: record._id },  
          update: {   
            $set: {   
              source: sourceValue  
            }   
          }  
        }  
      });  
    });  

    // 执行批量更新  
    if (bulkOperations.length > 0) {  
      const updateResult = await collection.bulkWrite(bulkOperations);  
      
      console.log('总记录数:', bulkOperations.length);  
      console.log('成功更新的记录数:', updateResult.modifiedCount);  
    }  

  } catch (error) {  
    console.error('处理出错:', error);  
  } finally {  
    await client.close();  
  }  
}  


async function updateSourceFromZhenTiToXiZongZhenTi() {  
  // 连接MongoDB  
  const client = new MongoClient('mongodb://localhost:27017/');  

  try {  
    await client.connect();  
    const database = client.db('QuizBank');  
    const collection = database.collection('a1');  

    // 明确指定批量更新操作的类型  
    const bulkOperations: Array<{  
      updateOne: {  
        filter: Filter<Document>,  
        update: UpdateFilter<Document>  
      }  
    }> = [];  

    // 查询所有source为"真题"的记录  
    const query = { source: "真题" };  
    const cursor = collection.find(query);  

    // 遍历所有记录  
    await cursor.forEach(record => {  
      bulkOperations.push({  
        updateOne: {  
          filter: { _id: record._id },  
          update: {   
            $set: {   
              source: "西综真题"  
            }   
          }  
        }  
      });  
    });  

    // 执行批量更新  
    if (bulkOperations.length > 0) {  
      const updateResult = await collection.bulkWrite(bulkOperations);  
      
      console.log('查询到的"真题"记录数:', bulkOperations.length);  
      console.log('成功更新的记录数:', updateResult.modifiedCount);  
    } else {  
      console.log('没有找到需要更新的记录');  
    }  

  } catch (error) {  
    console.error('处理出错:', error);  
  } finally {  
    await client.close();  
  }  
}  
// 执行处理  
updateSourceBasedOnExtractedYear();