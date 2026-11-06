// Only explicitly selected, consented fields leave the directory API.
const summaryFields = ['displayName', 'role', 'age', 'headline', 'workFields', 'city', 'department', 'arrondissement', 'projectTitle', 'projectCategory', 'projectStage'];
const detailFields = [...summaryFields, 'bio', 'education', 'professionalStatus', 'experience', 'availability', 'skills', 'projectDescription', 'collaborationType', 'lookingFor'];

export function discoveryProfile(raw, detail = false) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result = {};
  for (const field of detail ? detailFields : summaryFields) {
    if (source[field] !== undefined) result[field] = source[field];
  }
  if (detail && source.role === 'investor') {
    for (const field of ['investmentSectors', 'investmentProjectTypes', 'investmentAmount', 'investmentRanges']) {
      if (source[field] !== undefined) result[field] = source[field];
    }
  }
  const joining = ['Je cherche un projet à rejoindre', 'Je souhaite investir ou accompagner'];
  result.hasProject = source.role === 'founder' || Boolean(source.projectTitle && source.projectStage && !joining.includes(source.projectStage));
  return result;
}
