/**
 * Question Service
 * Database operations for questions with image support
 */

export async function fetchImageUrlsByQuestionIds(
  strapi: any,
  questionIds: number[]
): Promise<Map<number, string>> {
  if (!Array.isArray(questionIds) || questionIds.length === 0) return new Map();
  const knex = strapi.db.connection;

  const rows = await knex('files_related_mph as frm')
    .join('files as f', 'f.id', 'frm.file_id')
    .select('frm.related_id as questionId', 'f.url as imageUrl')
    .whereIn('frm.related_id', questionIds)
    .andWhere('frm.related_type', 'api::question.question')
    .andWhere('frm.field', 'image');

  const map = new Map<number, string>();
  for (const r of rows || []) {
    if (r?.questionId && r?.imageUrl) map.set(r.questionId, r.imageUrl);
  }
  return map;
}

export async function fetchImageCandidateForPhase(
  strapi: any,
  params: { locale: string; levels: number[]; includeDrafts: boolean }
): Promise<any | null> {
  const { locale, levels, includeDrafts } = params;
  const knex = strapi.db.connection;

  let query = knex('questions as q')
    .join('files_related_mph as frm', function (this: any) {
      this.on('frm.related_id', '=', 'q.id')
        .andOnVal('frm.related_type', 'api::question.question')
        .andOnVal('frm.field', 'image');
    })
    .join('files as f', 'f.id', 'frm.file_id')
    .select(
      'q.id',
      'q.document_id as documentId',
      'q.question',
      'q.option_a as optionA',
      'q.option_b as optionB',
      'q.option_c as optionC',
      'q.option_d as optionD',
      'q.explanation',
      'q.level',
      'q.topic',
      'q.locale',
      'f.url as imageUrl'
    )
    .where('q.locale', locale)
    .whereIn('q.level', Array.isArray(levels) ? levels : [])
    .orderBy('q.id', 'asc')
    .limit(1);

  if (!includeDrafts) {
    query = query.andWhereRaw("q.published_at IS NOT NULL AND q.published_at != ''");
  }

  const rows = await query;
  return rows?.[0] || null;
}

export async function fetchQuestionRowById(strapi: any, id: number | string): Promise<any | null> {
  const knex = strapi.db.connection;
  const rows = await knex('questions as q')
    .leftJoin('files_related_mph as frm', function (this: any) {
      this.on('frm.related_id', '=', 'q.id')
        .andOnVal('frm.related_type', 'api::question.question')
        .andOnVal('frm.field', 'image');
    })
    .leftJoin('files as f', 'f.id', 'frm.file_id')
    .select(
      'q.id',
      'q.document_id as documentId',
      'q.question',
      'q.option_a as optionA',
      'q.option_b as optionB',
      'q.option_c as optionC',
      'q.option_d as optionD',
      'q.correct_option as correctOption',
      'q.explanation',
      'q.topic',
      'q.topic_key as topicKey',
      'q.level',
      'q.locale',
      'q.base_id as baseId',
      'q.question_type as questionType',
      'q.published_at as publishedAt',
      'q.created_at as createdAt',
      'q.updated_at as updatedAt',
      'f.id as imageId',
      'f.url as imageUrl',
      'f.name as imageName'
    )
    .where('q.id', Number(id))
    .limit(1);

  const r = rows?.[0];
  if (!r) return null;

  return {
    id: r.id,
    documentId: r.documentId,
    question: r.question,
    optionA: r.optionA,
    optionB: r.optionB,
    optionC: r.optionC,
    optionD: r.optionD,
    correctOption: r.correctOption,
    explanation: r.explanation,
    topic: r.topic,
    topicKey: r.topicKey,
    level: r.level,
    locale: r.locale,
    baseId: r.baseId,
    questionType: r.questionType || (r.imageId ? 'image' : 'text'),
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    image: r.imageId ? { id: r.imageId, url: r.imageUrl, name: r.imageName } : null,
  };
}

/**
 * Check write token authorization
 */
export function requireWriteTokenIfConfigured(ctx: any): void {
  const requiredToken = process.env.STRAPI_WRITE_TOKEN;
  if (!requiredToken) return;

  const authHeader = ctx.request.headers?.authorization || '';
  const bearer = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;
  if (!bearer || bearer !== requiredToken) {
    ctx.unauthorized('Invalid or missing write token');
  }
}

/**
 * Normalize question object for API response
 */
export function normalizeQuestion(q: any, defaultLocale: string): any {
  const imgUrl =
    q?.imageUrl ||
    q?.image?.url ||
    (Array.isArray(q?.image) ? q.image?.[0]?.url : null) ||
    null;

  const qType = imgUrl ? 'image' : q?.questionType || q?.question_type || 'text';

  return {
    id: q.id,
    documentId: q.documentId,
    question: q.question,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    explanation: q.explanation,
    level: q.level,
    topic: q.topic,
    locale: q.locale || defaultLocale,
    questionType: qType,
    imageUrl: imgUrl,
  };
}
