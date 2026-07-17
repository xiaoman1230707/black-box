import instance from "./config";
import type { Post } from "@/types";

export interface SearchResponse {
  code: number;
  message: string;
  data: Post[];
}

export const doSearch = (keyword:string):Promise<SearchResponse> => {
  return instance.get(`/ai/search?keyword=${keyword}`, {
    timeout: 25_000,
  }) as unknown as Promise<SearchResponse>
}
