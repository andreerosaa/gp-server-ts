import Joi from 'joi';
import mongoose, { Schema } from 'mongoose';
import { ISession } from '../interfaces/session';

export const sessionSchema = new Schema(
	{
		date: { type: Date, required: true },
		therapistId: { type: String, required: true },
		patientId: { type: String },
		durationInMinutes: { type: Number, required: true },
		vacancies: { type: Number, required: true },
		status: { type: Number, required: true },
		seriesId: { type: String },
		confirmationToken: { type: String },
		cancelationToken: { type: String }
	},
	{
		timestamps: true
	}
);

export const Session = mongoose.model<ISession>('Session', sessionSchema);

export const getSessions = () => Session.find().sort({ date: 1 });
export const getSessionByQuery = (query: Object) => Session.find({ ...query }).sort({ date: 1 });
export const getSessionByDate = (date: Date) => Session.find({ date }).sort({ date: 1 });
export const getSessionByPatient = (patientId: string) => Session.find({ patientId }).sort({ date: 1 });
export const getSessionByTherapist = (therapistId: string) => Session.find({ therapistId }).sort({ date: 1 });
export const getSessionById = (id: string) => Session.findById(id);
export const createSession = (values: Record<string, any>) => new Session(values).save().then((session) => session.toObject());
export const createManySessions = (values: Record<string, any>, dates: Date[]) => {
	const sessions = dates.map((date) => ({
		...values,
		date
	}));

	return Session.insertMany(sessions).then((result) => result.map((session) => session.toObject()));
};
export const deleteSessionById = (id: string) => Session.findByIdAndDelete({ _id: id });
export const deleteManySessionsBySeriesId = (id: string) => Session.deleteMany({ seriesId: id });
export const deleteManySessionsByDay = (date: Date) => {
	const dateFilter = new Date(date);
	// Create start and end range
	const startOfDay = new Date(dateFilter.getFullYear(), dateFilter.getMonth(), dateFilter.getDate());
	const endOfDay = new Date(dateFilter.getFullYear(), dateFilter.getMonth(), dateFilter.getDate() + 1);

	return Session.deleteMany({ date: { $gte: startOfDay, $lt: endOfDay } });
};
export const updateSessionById = (id: string, values: Record<string, any>) => Session.findByIdAndUpdate(id, values, { new: true });

export const sessionValidation = Joi.object({
	date: Joi.date().required(),
	therapistId: Joi.string().id().required(),
	patientId: Joi.string().id(),
	durationInMinutes: Joi.number().required(),
	vacancies: Joi.number().required(),
	status: Joi.number().required(),
	seriesId: Joi.string(),
	confirmationToken: Joi.string(),
	cancelationToken: Joi.string()
});
