import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import { MongoGetAll } from '../decorators/mongoose/getAll';
import { MongoGet } from '../decorators/mongoose/get';
import { MongoCreate } from '../decorators/mongoose/create';
import { MongoQuery } from '../decorators/mongoose/query';
import { MongoUpdate } from '../decorators/mongoose/update';
import { MongoDelete } from '../decorators/mongoose/delete';
import { Template } from '../models/template';
import { authorizationHandler } from '../middleware/authorizationHandler';
import { roleHandler } from '../middleware/roleHandler';
import { RoleEnum } from '../interfaces/user';

@Controller('/template')
class TemplateController {
	@Route('get', '', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoGetAll(Template)
	getAll(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGetAll);
	}

	@Route('get', '/:id', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoGet(Template)
	getById(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGet);
	}

	@Route('post', '', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoCreate(Template)
	create(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoCreate);
	}

	@Route('post', '/query', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoQuery(Template)
	query(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoQuery);
	}

	@Route('patch', '/update/:id', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoUpdate(Template)
	update(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoUpdate);
	}

	@Route('delete', '/delete/:id', authorizationHandler, roleHandler(RoleEnum.ADMIN))
	@MongoDelete(Template)
	delete(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json({ message: 'deleted' });
	}
}

export default TemplateController;
