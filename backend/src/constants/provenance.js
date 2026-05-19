const provenance = require("../../../shared/provenance.json");

const EVENT_TYPES = provenance.eventTypes;
const SOURCE_TYPES = provenance.sourceTypes;
const EVENT_TYPE_VALUES = Object.values(EVENT_TYPES);
const SOURCE_TYPE_VALUES = Object.values(SOURCE_TYPES);

module.exports = {
  EVENT_TYPES,
  EVENT_TYPE_VALUES,
  SOURCE_TYPES,
  SOURCE_TYPE_VALUES
};
