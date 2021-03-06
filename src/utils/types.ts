import { EntityManager, PostgreSqlDriver } from "@mikro-orm/postgresql";
import { Request } from "express";
import { Field, ObjectType } from "type-graphql";
import { createBookLoader, createAuthorLoader } from "../loaders";

export type MyContext = {
  req: Request;
  em: EntityManager<PostgreSqlDriver>;
  bookLoader: ReturnType<typeof createBookLoader>;
  authorLoader: ReturnType<typeof createAuthorLoader>;
};

@ObjectType()
export class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
export class BaseResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
}
