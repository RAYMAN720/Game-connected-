function requiredText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateGameTypeInput(input) {
  const errors = [];
  if (!requiredText(input?.name)) errors.push('Il nome del tipo di gioco e obbligatorio');
  if (!requiredText(input?.description)) errors.push('La descrizione e obbligatoria');
  if (input?.score_limit !== undefined && input?.score_limit !== null && input?.score_limit !== '' && Number(input.score_limit) <= 0) {
    errors.push('Il limite di punteggio deve essere maggiore di zero');
  }
  const events = [
    input?.start_event || 'MATCH_START',
    input?.score_event_player1 || 'GOAL_PLAYER_1',
    input?.score_event_player2 || 'GOAL_PLAYER_2',
    input?.end_event || 'MATCH_END'
  ].map((value) => String(value).trim());
  if (new Set(events).size !== events.length) errors.push('Gli eventi del tipo di gioco devono essere diversi');
  if (events.some((value) => !/^[A-Z0-9_]+$/.test(value))) errors.push('I nomi degli eventi possono contenere solo lettere maiuscole, numeri e underscore');
  return errors;
}

function validateTournamentInput(input) {
  const errors = [];
  if (!requiredText(input?.name)) errors.push('Il nome del torneo e obbligatorio');
  if (!input?.game_type_id && !requiredText(input?.game_type)) errors.push('Il tipo di gioco e obbligatorio');
  if (!['INDIVIDUAL', 'TEAM'].includes(input?.participant_mode || 'INDIVIDUAL')) {
    errors.push('La modalita deve essere INDIVIDUAL oppure TEAM');
  }
  if (!Array.isArray(input?.locale_ids) || input.locale_ids.length === 0) {
    errors.push('Seleziona almeno un locale');
  }
  if (input?.start_date && input?.end_date && new Date(input.start_date) > new Date(input.end_date)) {
    errors.push('La data iniziale non puo essere successiva alla data finale');
  }
  return errors;
}

function validateMatchParticipants(input) {
  const mode = input?.participant_mode || 'INDIVIDUAL';
  if (!['INDIVIDUAL', 'TEAM'].includes(mode)) return ['Modalita partecipanti non valida'];
  if (mode === 'TEAM') {
    if (!input?.team1_id || !input?.team2_id) return ['Sono obbligatorie due squadre'];
    if (Number(input.team1_id) === Number(input.team2_id)) return ['Le squadre devono essere diverse'];
    return [];
  }
  const first = input?.player1_id || input?.player1_name;
  const second = input?.player2_id || input?.player2_name;
  if (!first || !second) return ['Sono obbligatori due giocatori'];
  if (String(first) === String(second)) return ['I giocatori devono essere diversi'];
  return [];
}

function validateSensorInput(input) {
  const errors = [];
  if (!input?.edge_device_id) errors.push('Il dispositivo edge e obbligatorio');
  if (!input?.game_id) errors.push('Il gioco e obbligatorio');
  if (!requiredText(input?.name)) errors.push('Il nome del sensore e obbligatorio');
  if (!requiredText(input?.sensor_type || input?.type)) errors.push('Il tipo di evento del sensore e obbligatorio');
  return errors;
}

module.exports = {
  validateGameTypeInput,
  validateTournamentInput,
  validateMatchParticipants,
  validateSensorInput
};
