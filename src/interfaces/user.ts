import { BaseModel } from './baseModel';

export interface IUser extends BaseModel {
	name: string;
	surname: string;
	email: string;
	verified: boolean;
	verificationCode: number;
	expirationCode: Date;
	password: string;
	role: RoleEnum;
}

export enum RoleEnum {
	ADMIN = 'admin',
	PATIENT = 'patient'
}
