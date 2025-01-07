import Joi from 'joi';
import mongoose, { Schema } from 'mongoose';

export const seriesSchema = new Schema(
	{
		recurrence: { type: String, required: true },
		startDate: { type: Date, required: true },
		endDate: { type: Date, required: true }
	},
	{
		timestamps: true
	}
);

export const Series = mongoose.model('Series', seriesSchema);

export const getSeriess = () => Series.find();
export const getSeriesById = (id: string) => Series.findById(id);
export const createSeries = (values: Record<string, any>) => new Series(values).save().then((series) => series.toObject());
export const deleteSeriesById = (id: string) => Series.findByIdAndDelete({ _id: id });
export const updateSeriesById = (id: string, values: Record<string, any>) => Series.findByIdAndUpdate(id, values, { new: true });

export const seriesValidation = Joi.object({
	recurrence: Joi.string().required(),
	startDate: Joi.date().required(),
	endDate: Joi.date().required()
});
