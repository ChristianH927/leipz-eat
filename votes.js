import { firebaseConfig } from './firebase-config.js';

const spots = window.LEIPZIG_RESTAURANTS || [];
const form = document.getElementById('vote-form');
const nameField = document.getElementById('vote-name');
const choices = document.getElementById('vote-choices');
const submit = document.getElementById('vote-submit');
const deleteButton = document.getElementById('vote-delete');
const status = document.getElementById('vote-status');
const results = document.getElementById('vote-results');
const total = document.getElementById('vote-total');
let database = null;
let user = null;
let voteRef = null;
let currentVotes = {};

const setStatus = (message, error = false) => {
  status.textContent = message;
  status.classList.toggle('error', error);
};
choices.innerHTML = spots.map(p =>
  `<label class="vote-choice"><input type="radio" name="restaurant" value="${p.id}" required><span class="vote-choice-name">${p.name}</span><span class="vote-choice-price">${p.price}</span></label>`
).join('');

function renderResults(votes = {}) {
  const valid = Object.values(votes).filter(v => v && typeof v.name === 'string' && spots.some(p => p.id === Number(v.spot)));
  total.textContent = valid.length + (valid.length === 1 ? ' Stimme' : ' Stimmen');
  const sorted = spots.map(p => ({...p, voters: valid.filter(v => Number(v.spot) === p.id)}))
    .sort((a, b) => b.voters.length - a.voters.length || a.id - b.id);
  results.replaceChildren();
  for (const spot of sorted) {
    const row = document.createElement('div');
    row.className = 'vote-result';
    const label = document.createElement('div');
    label.className = 'vote-result-top';
    const name = document.createElement('strong');
    name.textContent = spot.name;
    const count = document.createElement('span');
    count.textContent = spot.voters.length + ' · ' + (valid.length ? Math.round(100 * spot.voters.length / valid.length) : 0) + '%';
    label.append(name, count);
    const track = document.createElement('div');
    track.className = 'vote-track';
    const fill = document.createElement('div');
    fill.className = 'vote-fill';
    fill.style.width = (valid.length ? 100 * spot.voters.length / valid.length : 0) + '%';
    track.append(fill);
    row.append(label, track);
    if (spot.voters.length) {
      const names = document.createElement('small');
      names.className = 'vote-voters';
      names.textContent = spot.voters.map(v => v.name.trim()).join(' · ');
      row.append(names);
    }
    results.append(row);
  }
}
function showOwnVote() {
  if (!user) return;
  const mine = currentVotes[user.uid];
  if (mine) {
    nameField.value = mine.name || '';
    const input = choices.querySelector(`input[value="${Number(mine.spot)}"]`);
    if (input) input.checked = true;
    deleteButton.hidden = false;
    submit.textContent = 'Stimme aktualisieren';
  } else {
    deleteButton.hidden = true;
    submit.textContent = 'Jetzt abstimmen';
  }
}
renderResults();

if (!firebaseConfig?.apiKey || !firebaseConfig?.databaseURL) {
  setStatus('Die Abstimmung wird noch eingerichtet. Ergebnisse erscheinen nach der Freischaltung.');
} else {
  initialize().catch(error => {
    console.error('Abstimmungsdienst:', error);
    setStatus('Abstimmung derzeit nicht erreichbar. Bitte später erneut versuchen.', true);
  });
}

async function initialize() {
  const [{initializeApp}, {getAuth, signInAnonymously}, {getDatabase, ref, onValue, set, remove, serverTimestamp}] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js')
  ]);
  const app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  const auth = getAuth(app);
  const votesPath = ref(database, 'leipz-eat/votes');

  onValue(votesPath, snap => {
    currentVotes = snap.val() || {};
    renderResults(currentVotes);
    showOwnVote();
  }, error => setStatus('Ergebnisse können nicht geladen werden: ' + error.message, true));

  const credential = await signInAnonymously(auth);
  user = credential.user;
  voteRef = ref(database, 'leipz-eat/votes/' + user.uid);
  submit.disabled = false;
  setStatus('Dein Name wird mit deiner Restaurantwahl öffentlich angezeigt. Pro Browser ist eine Stimme vorgesehen.');
  showOwnVote();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = nameField.value.trim().replace(/\s+/g, ' ');
    const selected = form.querySelector('input[name="restaurant"]:checked');
    if (name.length < 2 || name.length > 30 || !selected) {
      setStatus('Bitte Namen (2–30 Zeichen) und ein Restaurant auswählen.', true);
      return;
    }
    const duplicate = Object.entries(currentVotes).some(([uid, v]) =>
      uid !== user.uid && typeof v?.name === 'string' && v.name.trim().toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE')
    );
    if (duplicate) {
      setStatus('Dieser Name ist bereits eingetragen. Bitte nutze zur Unterscheidung einen eindeutigen Namen.', true);
      return;
    }
    submit.disabled = true;
    setStatus('Stimme wird gespeichert …');
    try {
      await set(voteRef, {name, spot:Number(selected.value), updated:serverTimestamp()});
      setStatus('Stimme gespeichert. Du kannst deine Auswahl hier jederzeit ändern.');
    } catch (error) {
      console.error(error);
      setStatus('Speichern fehlgeschlagen. Bitte Firebase-Regeln und Verbindung prüfen.', true);
    } finally {
      submit.disabled = false;
    }
  });

  deleteButton.addEventListener('click', async () => {
    if (!user || !voteRef) return;
    deleteButton.disabled = true;
    try {
      await remove(voteRef);
      form.reset();
      nameField.value = '';
      setStatus('Deine Stimme wurde entfernt.');
    } catch (error) {
      setStatus('Stimme konnte nicht entfernt werden.', true);
    } finally {
      deleteButton.disabled = false;
    }
  });
}
