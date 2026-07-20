let selectedTypeId = null;
let editingTypeId = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = requireUser(['GAME_ADMIN']);
  if (!user) return;
  renderSidebar('dashboard');
  $('#game-type-form').addEventListener('submit', saveType);
  $('#cancel-type-edit').addEventListener('click', resetTypeForm);
  $('#template-form').addEventListener('submit', createTemplate);
  $('#game-types-list').addEventListener('click', handleTypeClick);
  $('#templates-list').addEventListener('click', handleTemplateClick);
  loadTypes();
});

async function saveType(event) {
  event.preventDefault();
  const body = getFormData(event.target);
  delete body.id;
  body.supports_teams = body.supports_teams === 'true';
  body.score_limit = body.score_limit ? Number(body.score_limit) : null;

  try {
    if (editingTypeId) {
      await apiRequest(`/game-types/${editingTypeId}`, { method: 'PUT', body });
      showMessage('#type-message', 'Tipo di gioco aggiornato', 'empty');
    } else {
      await apiPost('/game-types', body);
      showMessage('#type-message', 'Tipo di gioco creato', 'empty');
    }
    resetTypeForm();
    await loadTypes();
  } catch (error) {
    showMessage('#type-message', error.message, 'error-message');
  }
}

function resetTypeForm() {
  editingTypeId = null;
  $('#game-type-form').reset();
  $('#editing-game-type-id').value = '';
  $('#save-type-btn').textContent = 'Crea tipo';
  $('#cancel-type-edit').classList.add('hidden');
}

async function loadTypes() {
  try {
    const types = await apiGet('/game-types');
    $('#game-types-list').innerHTML = types.map((type) => `
      <article class="card">
        <div class="panel-title">
          <div>
            <h3>${escapeHtml(type.name)}</h3>
            <p class="card-note">${escapeHtml(type.description)}</p>
          </div>
          <span class="badge">${type.sensor_templates_count} sensori</span>
        </div>
        <p class="meta">Inizio: ${escapeHtml(type.start_event)}</p>
        <p class="meta">Punti: ${escapeHtml(type.score_event_player1)} / ${escapeHtml(type.score_event_player2)}</p>
        <p class="meta">Fine: ${escapeHtml(type.end_event)} | Limite: ${type.score_limit || 'manuale'}</p>
        <div class="actions">
          <button class="btn secondary" data-action="edit" data-id="${type.id}">Modifica e sensori</button>
          <button class="btn danger" data-action="delete" data-id="${type.id}">Elimina</button>
        </div>
      </article>
    `).join('') || '<div class="empty">Nessun tipo</div>';

    if (types.length && !selectedTypeId) await selectType(types[0].id, false);
  } catch (error) {
    showMessage('#game-types-list', error.message, 'error-message');
  }
}

async function handleTypeClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  if (button.dataset.action === 'edit') await selectType(button.dataset.id, true);
  if (button.dataset.action === 'delete' && confirm('Eliminare questo tipo?')) {
    try {
      await apiRequest(`/game-types/${button.dataset.id}`, { method: 'DELETE' });
      if (Number(selectedTypeId) === Number(button.dataset.id)) selectedTypeId = null;
      resetTypeForm();
      await loadTypes();
    } catch (error) {
      alert(error.message);
    }
  }
}

async function selectType(id, editForm = false) {
  selectedTypeId = Number(id);
  $('#selected-game-type-id').value = id;

  try {
    const type = await apiGet(`/game-types/${id}`);
    $('#templates-list').innerHTML = `
      <h3>${escapeHtml(type.name)}</h3>
      ${type.sensor_templates.map((template) => `
        <div class="event-item">
          <strong>${escapeHtml(template.name)}</strong>
          <span class="badge mqtt-badge">${escapeHtml(template.event_type)}</span>
          <p class="card-note">${escapeHtml(template.description)}</p>
          <button class="btn danger" data-template-id="${template.id}">Elimina</button>
        </div>
      `).join('') || '<div class="empty">Aggiungi il primo modello sensore</div>'}
    `;

    if (editForm) {
      editingTypeId = Number(type.id);
      const form = $('#game-type-form');
      form.elements.name.value = type.name;
      form.elements.description.value = type.description;
      form.elements.score_limit.value = type.score_limit || '';
      form.elements.start_event.value = type.start_event;
      form.elements.score_event_player1.value = type.score_event_player1;
      form.elements.score_event_player2.value = type.score_event_player2;
      form.elements.end_event.value = type.end_event;
      form.elements.supports_teams.value = String(Boolean(type.supports_teams));
      $('#editing-game-type-id').value = type.id;
      $('#save-type-btn').textContent = 'Salva modifiche';
      $('#cancel-type-edit').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (error) {
    showMessage('#templates-list', error.message, 'error-message');
  }
}

async function createTemplate(event) {
  event.preventDefault();
  if (!selectedTypeId) {
    alert('Seleziona un tipo di gioco');
    return;
  }
  const body = getFormData(event.target);
  delete body.game_type_id;
  try {
    await apiPost(`/game-types/${selectedTypeId}/sensor-templates`, body);
    event.target.reset();
    $('#selected-game-type-id').value = selectedTypeId;
    await selectType(selectedTypeId, false);
    await loadTypes();
  } catch (error) {
    alert(error.message);
  }
}

async function handleTemplateClick(event) {
  const button = event.target.closest('button[data-template-id]');
  if (!button) return;
  try {
    await apiRequest(`/game-types/${selectedTypeId}/sensor-templates/${button.dataset.templateId}`, { method: 'DELETE' });
    await selectType(selectedTypeId, false);
    await loadTypes();
  } catch (error) {
    alert(error.message);
  }
}
