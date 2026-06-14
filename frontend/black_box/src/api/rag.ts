import instance from "./config";
 
export const ask = async (question:string):Promise<{answer:string}>=>{
    return await instance.post('/ai/rag',{question});    
}
