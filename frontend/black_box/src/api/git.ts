import axios from './config'

export const fetchCommit = async (diff: string) => {
  const res = await axios.post<any, { code: number, commit: string }>('/ai/git', { diff })
  console.log(res);
  return res;
}