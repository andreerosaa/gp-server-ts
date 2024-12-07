import Joi from 'joi';
import mongoose, { Schema } from 'mongoose';

export const therapistSchema = new Schema(
	{
		name: { type: String, required: true, unique: true }
	},
	{
		timestamps: true
	}
);

export const Therapist = mongoose.model('Therapist', therapistSchema);

export const getTherapists = () => Therapist.find();
export const getTherapistByName = (name: string) => Therapist.findOne({ name });
export const getTherapistById = (id: string) => Therapist.findById(id);
export const createTherapist = (values: Record<string, any>) => new Therapist(values).save().then((user) => user.toObject());
export const deleteTherapistById = (id: string) => Therapist.findByIdAndDelete({ _id: id });
export const updateTherapistById = (id: string, values: Record<string, any>) => Therapist.findByIdAndUpdate(id, values, { new: true });

export const therapistValidation = Joi.object({
	name: Joi.string().required()
});
