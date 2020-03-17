import Joi from '@hapi/joi'

export type Options = {
  folders?: {
    [glob: string]: {
      match?: string
      allowUntrackedFiles?: boolean
    }
  }
  files?: {
    [glob: string]: {
      match?: string
      imports?: {
        allow?: Array<
          | string
          | {
              glob: string
            }
        >
        disallow?: Array<
          | string
          | {
              glob: string
              message?: string
            }
        >
      }
      exports: {
        [name: string]: {
          type?: string
          match?: string
        }
      }
      requires: string[]
    }
  }
}

export default Joi.object({
  folders: Joi.object()
    .optional()
    .pattern(
      Joi.string(),
      Joi.object({
        match: Joi.string().optional(),
        allowUntrackedFiles: Joi.boolean().optional(),
      }),
    ),
  files: Joi.object()
    .optional()
    .pattern(
      Joi.string(),
      Joi.object({
        match: Joi.string().optional(),
        imports: Joi.object({
          allow: Joi.array()
            .items(
              Joi.string(),
              Joi.object({
                glob: Joi.string(),
              }),
            )
            .optional(),
          disallow: Joi.array()
            .items(
              Joi.string(),
              Joi.object({
                glob: Joi.string(),
                message: Joi.string().optional(),
              }),
            )
            .optional(),
        }).optional(),
        exports: Joi.object()
          .optional()
          .pattern(
            Joi.string(),
            Joi.object({
              type: Joi.string().optional(),
              match: Joi.string().optional(),
            }),
          ),
        requires: Joi.array()
          .items(Joi.string())
          .optional(),
      }),
    ),
})
