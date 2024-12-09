import { ObjectId } from 'mongoose';
import { BaseModel } from './baseModel';
import Joi, { date } from 'joi';

export interface ISession extends BaseModel {
	date: Date;
	therapistId: ObjectId;
	patientId: ObjectId;
	durationInMinutes: number;
	vacancies: number;
	status: SessionStatusEnum;
	confirmationToken: string;
	cancelationToken: string;
}

export interface ISessionByDate extends BaseModel {
	date: Date;
	therapist: { id: ObjectId; name: string };
	patientId: ObjectId;
	durationInMinutes: number;
	vacancies: number;
	status: SessionStatusEnum;
	confirmationToken: string;
	cancelationToken: string;
}

export interface IBookSessionRequest {
	email: string;
	patientName: string;
}

export const bookSessionRequestValidation = Joi.object({
	email: Joi.string().email().required(),
	patientName: Joi.string().required()
});

export interface ISearchSessionByDate {
	date: Date;
}

export const searchSessionByDateRequestValidation = Joi.object({
	date: Joi.date().required()
});

export enum SessionStatusEnum {
	AVAILABLE,
	PENDING,
	CONFIRMED,
	COMPLETED,
	CANCELED
}
