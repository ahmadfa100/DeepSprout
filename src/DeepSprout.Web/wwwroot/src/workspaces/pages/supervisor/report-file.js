import * as u from '../../ui.js';
import {save, remove, REPORT_RULES} from '../../../shared/attachments.js';

export async function submitSummary(form, ctx, message) {
  const file = form.elements.attachment?.files?.[0];
  const attachment = file ? await save(file, {ownerId:ctx.person.id, purpose:'supervisor-report', rules:REPORT_RULES}) : null;
  try {
    const coachReportIds = [...form.querySelectorAll('[name=coachReportIds]:checked')].map(input => input.value);
    ctx.run('initiative.supervisor.summary', {initiativeId:form.dataset.initiative, ...u.formValues(form), coachReportIds, attachment}, message);
  } catch (error) {
    if (attachment) await remove(attachment.id).catch(() => {});
    throw error;
  }
  ctx.render();
}
