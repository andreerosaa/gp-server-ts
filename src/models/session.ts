import Joi from 'joi';
import mongoose, { Schema } from 'mongoose';

export const sessionSchema = new Schema(
	{
		date: { type: Date, required: true },
		therapistId: { type: String, required: true },
		patientId: { type: String },
		durationInMinutes: { type: Number, required: true },
		vacancies: { type: Number, required: true },
		status: { type: Number, required: true },
		confirmationToken: { type: String },
		cancelationToken: { type: String }
	},
	{
		timestamps: true
	}
);

export const Session = mongoose.model('Session', sessionSchema);

export const getSessions = () => Session.find();
export const getSessionByQuery = (query: Object) => Session.find({ ...query }).sort({ date: 1 });
export const getSessionByDate = (date: Date) => Session.find({ date });
export const getSessionByPatient = (patientId: string) => Session.find({ patientId });
export const getSessionByTherapist = (therapistId: string) => Session.find({ therapistId });
export const getSessionById = (id: string) => Session.findById(id);
export const createSession = (values: Record<string, any>) => new Session(values).save().then((session) => session.toObject());
export const deleteSessionById = (id: string) => Session.findByIdAndDelete({ _id: id });
export const updateSessionById = (id: string, values: Record<string, any>) => Session.findByIdAndUpdate(id, values, { new: true });

export const sessionValidation = Joi.object({
	date: Joi.date().required(),
	therapistId: Joi.string().id().required(),
	patientId: Joi.string().id(),
	durationInMinutes: Joi.number().required(),
	vacancies: Joi.number().required(),
	status: Joi.number().required(),
	confirmationToken: Joi.string(),
	cancelationToken: Joi.string()
});
