const form = document.querySelector('#waitlist');
const submitButton = document.querySelector('#quiz-submit');
const message = document.querySelector('#message');
const recipient = 'kairos.contact01@gmail.com';
const endpoint = `https://formsubmit.co/ajax/${recipient}`;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const values = new FormData(form);
  const payload = {
    email: values.get('email').trim().toLowerCase(),
    _replyto: values.get('email').trim().toLowerCase(),
    _subject: 'Nouveau retour au quiz de pré-lancement Kairos',
    situation: values.get('status'),
    principal_frein: values.get('barrier'),
    aide_souhaitee: values.get('support'),
    consentement: 'Oui',
  };

  submitButton.disabled = true;
  submitButton.textContent = 'Envoi en cours…';
  message.className = 'form-message';
  message.textContent = '';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || result.success === false || result.success === 'false') {
      throw new Error(result.message || 'Submission failed');
    }
    form.reset();
    message.textContent = 'Merci ! Vos réponses ont été envoyées à Kairos.';
  } catch {
    message.textContent = 'Impossible d’envoyer vos réponses pour le moment. Vérifiez votre connexion et réessayez.';
    message.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Envoyer mes réponses <span>↗</span>';
  }
});
