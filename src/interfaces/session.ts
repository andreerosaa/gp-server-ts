import { BaseModel } from './baseModel';
import Joi from 'joi';

export interface ISession extends BaseModel {
	date: Date;
	therapistId: string;
	userId: string;
	durationInMinutes: number;
	vacancies: number;
	status: SessionStatusEnum;
	confirmationToken: string;
	cancelationToken: string;
	seriesId: string;
}

export interface ISessionByDate extends BaseModel {
	date: Date;
	therapist: { id: string; name: string };
	userId: string;
	durationInMinutes: number;
	vacancies: number;
	status: SessionStatusEnum;
	confirmationToken: string;
	cancelationToken: string;
	seriesId: string;
}

export interface IBookSessionRequest {
	userId: string;
}

export const bookSessionRequestValidation = Joi.object({
	userId: Joi.string().required()
});

export interface ISearchSessionByDate {
	date: Date;
}

export const searchSessionByDateRequestValidation = Joi.object({
	date: Joi.date().required()
});

export interface IDayStatusByMonth {
	month: number;
	year: number;
}

export const getMonthlySessionsRequestValidation = Joi.object({
	month: Joi.number().required(),
	year: Joi.number().required()
});

export interface DayStatusByMonth {
	available: Date[]; //at least one available
	pending: Date[]; //at least one pending
	full: Date[]; //none available
}

export enum SessionStatusEnum {
	AVAILABLE = 'available',
	PENDING = 'pending',
	CONFIRMED = 'confirmed',
	COMPLETED = 'completed',
	CANCELED = 'canceled'
}

export interface ICreateRecurringSessionRequest {
	date: Date;
	therapistId: string;
	durationInMinutes: number;
	vacancies: number;
	recurrence: SessionRecurrenceEnum;
	status: SessionStatusEnum;
}

export interface ICreateFromTemplateRequest {
	date: Date;
	templateId: string;
}

export interface IClearDayRequest {
	date: Date;
	templateId: string;
}

export const createRecurringSessionValidation = Joi.object({
	date: Joi.date().required(),
	therapistId: Joi.string().required(),
	durationInMinutes: Joi.number().required(),
	vacancies: Joi.number().required(),
	recurrence: Joi.number().required(),
	status: Joi.number().required()
});

export const createFromTemplateValidation = Joi.object({
	date: Joi.date().required(),
	templateId: Joi.string().required()
});

export const clearDayValidation = Joi.object({
	date: Joi.date().required()
});

export enum SessionRecurrenceEnum {
	DAILY,
	WEEKDAYS,
	WEEKLY,
	MONTHLY
}
