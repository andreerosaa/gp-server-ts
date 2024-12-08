import Joi from 'joi';
import { BaseModel } from './baseModel';

export interface IPatient extends BaseModel {
	name: string;
	email: string;
	verified: boolean;
	verificationCode: number;
	expirationCode: Date;
}

export interface IVerifyPatient {
	verificationCode: number;
}

export const verifyPatientRequestValidationn = Joi.object({
	verificationCode: Joi.number().required()
});

export interface IGetPatientByEmail {
	email: string;
}

export const getPatientByEmailRequestValidationn = Joi.object({
	email: Joi.string().email().required()
});

export interface IUpdatePatientName {
	name: string;
	email: string;
}

export const updatePatientNameRequestValidationn = Joi.object({
	name: Joi.string().required(),
	email: Joi.string().email().required()
});
