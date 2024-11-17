import { BaseModel } from './baseModel';

export interface IUser extends BaseModel {
	username: string;
	password?: string;
}
