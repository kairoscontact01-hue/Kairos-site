import { endpoint, method, json, HttpError } from '../../server/http.js';
import { administrator } from '../../server/auth.js';
import { ready } from '../../server/db.js';
import { CATALOGS } from '../../server/catalogs.js';

export default endpoint(async request => {
  method(request, ['GET']);
  await administrator(request);
  const params = new URL(request.url).searchParams;
  const q = (params.get('q') || '').trim();
  const role = params.get('role') || '';
  const sector = params.get('sector') || '';
  const department = params.get('department') || '';
  const pageText = params.get('page') || '0';
  if (q.length > 120 || !['', 'founder', 'partner', 'investor'].includes(role) || (sector && !CATALOGS.sectors.includes(sector)) || (department && !CATALOGS.departments.some(([id]) => id === department)) || !/^\d{1,5}$/.test(pageText)) {
    throw new HttpError(400, 'INVALID_FILTER', 'Vérifiez les critères de recherche.');
  }
  const page = Number(pageText), pageSize = 24, offset = page * pageSize;
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
  const sql = await ready();
  // Never include photos or complete private responses in the paginated list.
  const result = await sql.transaction([
    sql`SELECT count(*)::integer AS total FROM kairos_profiles
      WHERE (${q} = '' OR concat_ws(' ', private_profile->>'firstName', private_profile->>'lastName', email, private_profile->>'projectTitle') ILIKE ${pattern})
        AND (${role} = '' OR private_profile->>'role' = ${role})
        AND (${sector} = '' OR private_profile->>'projectCategory' = ${sector})
        AND (${department} = '' OR private_profile->>'department' = ${department})`,
    sql`SELECT id, private_profile->>'firstName' AS first_name, private_profile->>'lastName' AS last_name,
      email, private_profile->>'role' AS role, private_profile->>'headline' AS headline,
      private_profile->>'city' AS city, private_profile->>'department' AS department,
      private_profile->>'projectTitle' AS project_title, private_profile->>'projectCategory' AS sector,
      (photo_base64 IS NOT NULL) AS has_photo, public_consent, published, created_at, updated_at
      FROM kairos_profiles
      WHERE (${q} = '' OR concat_ws(' ', private_profile->>'firstName', private_profile->>'lastName', email, private_profile->>'projectTitle') ILIKE ${pattern})
        AND (${role} = '' OR private_profile->>'role' = ${role})
        AND (${sector} = '' OR private_profile->>'projectCategory' = ${sector})
        AND (${department} = '' OR private_profile->>'department' = ${department})
      ORDER BY created_at DESC, id DESC LIMIT ${pageSize} OFFSET ${offset}`
  ]);
  return json({ profiles: result[1].map(row => ({ id: row.id, firstName: row.first_name, lastName: row.last_name,
    email: row.email, role: row.role, headline: row.headline, city: row.city, department: row.department,
    projectTitle: row.project_title, sector: row.sector, hasPhoto: row.has_photo,
    publicConsent: row.public_consent, published: row.published, createdAt: row.created_at, updatedAt: row.updated_at })),
    total: result[0][0].total, page, pageSize });
});
