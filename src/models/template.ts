import Joi from 'joi';
import mongoose, { Schema } from 'mongoose';

export const templateSchema = new Schema(
	{
		name: { type: String, required: true },
		startTimes: { type: [Date], required: true },
		therapistId: { type: String, required: true },
		durationInMinutes: { type: Number, required: true },
		vacancies: { type: Number, required: true }
	},
	{
		timestamps: true
	}
);

export const Template = mongoose.model('Template', templateSchema);

export const getTemplates = () => Template.find();
export const getTemplateByName = (name: string) => Template.findOne({ name });
export const getTemplateById = (id: string) => Template.findById(id);
export const createTemplate = (values: Record<string, any>) => new Template(values).save().then((template) => template.toObject());
export const deleteTemplateById = (id: string) => Template.findByIdAndDelete({ _id: id });
export const updateTemplateById = (id: string, values: Record<string, any>) => Template.findByIdAndUpdate(id, values, { new: true });

export const templateValidation = Joi.object({
	name: Joi.string().required(),
	startTimes: Joi.array().items(Joi.date()).required(),
	therapistId: Joi.string().required(),
	durationInMinutes: Joi.number().required(),
	vacancies: Joi.number().required()
});
