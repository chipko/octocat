import axios from 'axios';
import { api } from './config';

export interface Branch {
  branchId: number;
  name: string;
  address: string;
}

export const fetchBranches = async (): Promise<Branch[]> => {
  const { data } = await axios.get<Branch[]>(`${api.baseURL}${api.endpoints.branches}`);
  return data;
};
