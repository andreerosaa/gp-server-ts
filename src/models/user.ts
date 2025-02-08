import Joi from 'joi';
import mongoose, { Schema } from 'mongoose';
import { IUser } from '../interfaces/user';

export const userSchema = new Schema(
	{
		name: { type: String, required: true },
		surname: { type: String, required: true },
		email: {
			type: String,
			required: true,
			unique: true,
			match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please fill a valid email address']
		},
		verified: { type: Boolean, default: false, required: true },
		verificationCode: { type: Number, required: true },
		expirationCode: { type: Date, required: true },
		password: { type: String, required: true, select: false },
		role: { type: String, enum: ['admin', 'patient'], default: 'patient', required: true }
	},
	{
		timestamps: true
	}
);

export const User = mongoose.model<IUser>('User', userSchema);

export const getUsers = () => User.find();
export const getUserByEmail = (email: string) => User.findOne({ email });
export const getUserById = (id: string) => User.findById(id);
export const createUser = (values: Record<string, any>) => new User(values).save().then((user) => user.toObject());
export const deleteUserById = (id: string) => User.findByIdAndDelete({ _id: id });
export const updateUserById = (id: string, values: Record<string, any>) => User.findByIdAndUpdate(id, values, { new: true });

export const loginUserValidation = Joi.object({
	email: Joi.string().required(),
	password: Joi.string().required()
});

export const registerUserValidation = Joi.object({
	name: Joi.string().required(),
	surname: Joi.string().required(),
	email: Joi.string().email().required(),
	password: Joi.string().required()
	// role: Joi.string().valid('admin', 'patient').required()
});

export const verifyEmailValidation = Joi.object({
	verificationCode: Joi.number().required()
});
