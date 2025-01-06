import { ObjectId } from 'mongoose';
import { BaseModel } from './baseModel';
import Joi from 'joi';

export interface ISession extends BaseModel {
	date: Date;
	therapistId: ObjectId;
	patientId: ObjectId;
	durationInMinutes: number;
	vacancies: number;
	status: SessionStatusEnum;
	confirmationToken: string;
	cancelationToken: string;
	seriesId: string;
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
	seriesId: string;
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

export interface ICreateRecurringSessionRequest {
	date: Date;
	therapistId: string;
	durationInMinutes: number;
	vacancies: number;
	recurrence: SessionRecurrenceEnum;
	status: SessionStatusEnum;
}

export const createRecurringSessionValidation = Joi.object({
	date: Joi.string().required(),
	therapistId: Joi.string().required(),
	durationInMinutes: Joi.number().required(),
	vacancies: Joi.number().required(),
	recurrence: Joi.number().required(),
	status: Joi.number().required()
});

export enum SessionRecurrenceEnum {
	DAILY,
	WEEKDAYS,
	WEEKLY,
	MONTHLY
}
