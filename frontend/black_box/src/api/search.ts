import instance from "./config";

export const doSearch = (keyword:string) => {
  return instance.get(`/ai/search?keyword=${keyword}`)
}