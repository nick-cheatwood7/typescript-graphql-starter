import "dotenv-safe/config";
import express, { Request } from "express";
import { createServer } from "@graphql-yoga/node";
import { Connection, IDatabaseDriver, MikroORM } from "@mikro-orm/core";
import mikroOrmConfig from "./mikro-orm.config";
import { __prod__, __test__ } from "./utils/constants";
import { createAuthorLoader, createBookLoader } from "./loaders";
import { Server } from "http";
import cors from "cors";
import { MyContext } from "./utils/types";
import { createSchema } from "./utils/helpers/createSchema";

export default class Application {
  public orm: MikroORM<IDatabaseDriver<Connection>>;
  public host: express.Application;
  public server: Server;

  public connect = async (): Promise<void> => {
    try {
      this.orm = await MikroORM.init(mikroOrmConfig);
      const migrator = this.orm.getMigrator();
      const migrations = await migrator.getPendingMigrations();
      if (migrations && migrations.length > 0) {
        // Run migrations
        await migrator.up();
      }
    } catch (err) {
      console.error("⚠️ Could not connect to database.");
      throw Error(err);
    }
  };

  public init = async (): Promise<void> => {
    this.host = express();

    // Enable cors
    this.host.use(cors());

    // Build GraphQL schema
    try {
      // Define resolvers and schema
      const schema = await createSchema();

      // Create GraphQL server
      const graphQLServer = createServer({
        schema,
        graphiql: !__prod__,
        context: ({ req }) => {
          return {
            req: req as Request,
            em: this.orm.em.fork(),
            bookLoader: createBookLoader(this.orm.em),
            authorLoader: createAuthorLoader(this.orm.em),
          } as MyContext;
        },
        maskedErrors: {
          handleParseErrors: true,
          handleValidationErrors: true,
        },
      });
      // Bind GraphQL to `/graphql` endpoint
      this.host.use("/graphql", graphQLServer);
      this.host.use(express.json());
      // Listen
      const port =
        parseInt(__test__ ? process.env.TEST_PORT : process.env.PORT) || 5000;
      this.server = this.host.listen(port, () => {
        !__test__ &&
          console.log(
            `GraphQL Yoga server listening as http://localhost:${port}/graphql`
          );
      });
    } catch (err) {
      console.error("Could not start GraphQL Yoga server");
      throw Error(err);
    }
  };

  public disconnect = async (): Promise<void> => {
    // Disconnect from db
    try {
      await this.orm.close();
    } catch (err) {
      throw Error(err);
    }
  };

  public deInit = async (): Promise<void> => {
    // Close the HTTP server
    try {
      this.server.close();
    } catch (err) {
      throw Error(err);
    }
  };
}
