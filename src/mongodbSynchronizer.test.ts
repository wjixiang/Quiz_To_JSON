import { synchronizer } from "./mongodbSynchronizer";
import * as fs from 'fs/promises'

describe(synchronizer, ()=>{
    const syncer = new synchronizer()
    
    it.skip("load json quiz", async()=>{
        const data = await syncer.loadJson()
        console.log(data)
        expect(data)
    }, 60000)

    it("convert data type of quiz and sync to db", async()=>{
        await syncer.initDatabase()
        const data = await syncer.loadJson()
        const collection =  syncer.convert(data[0])
        console.log(collection)
        expect(collection)
        if(collection){
            syncer.sync(collection)
        }
    },10000)
})