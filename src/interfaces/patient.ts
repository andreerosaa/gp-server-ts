import { BaseModel } from './baseModel';

export interface IPatient extends BaseModel {
	name: string;
	phoneNumber: string;
}
