import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import * as dotenv from 'dotenv'
import { join } from 'path'
import { DataSource, DataSourceOptions } from 'typeorm'

dotenv.config({
    path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
})

const isProduction = process.env.NODE_ENV === 'production'

export const ORMConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
        join(__dirname, 'src/**/*.entity{.ts,.js}'),
        join(__dirname, 'dist/**/*.entity{.ts,.js}'),
    ],
    synchronize:
        process.env.DB_SYNCHRONIZE !== undefined
            ? process.env.DB_SYNCHRONIZE === 'true'
            : !isProduction,
    autoLoadEntities: true,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
}

export const AppDataSource = new DataSource(ORMConfig as DataSourceOptions)