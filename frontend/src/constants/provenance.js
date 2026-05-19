import provenance from '../../../shared/provenance.json'

export const EVENT_TYPES = provenance.eventTypes
export const SOURCE_TYPES = provenance.sourceTypes

export const SOURCE_OPTIONS = [
    { value: SOURCE_TYPES.OWN_DRAFT, label: 'Own draft' },
    { value: SOURCE_TYPES.OWN_NOTES, label: 'Own notes' },
    { value: SOURCE_TYPES.LECTURE_MATERIAL, label: 'Lecture material' },
    { value: SOURCE_TYPES.TUTOR_HINT, label: 'Tutor hint' },
    { value: SOURCE_TYPES.EXTERNAL_AI, label: 'External AI' },
    { value: SOURCE_TYPES.PEER_DISCUSSION, label: 'Peer discussion' },
    { value: SOURCE_TYPES.OTHER, label: 'Other' },
]

export function formatSourceLabel(sourceType) {
    const match = SOURCE_OPTIONS.find((option) => option.value === sourceType)
    return match?.label || sourceType || 'Unknown source'
}

export function formatEventLabel(eventType) {
    switch (eventType) {
        case EVENT_TYPES.TUTOR_HINT_USED:
            return 'Tutor hint used'
        case EVENT_TYPES.LECTURE_ACCESSED:
            return 'Lecture material opened'
        case EVENT_TYPES.LARGE_PASTE_DETECTED:
            return 'Large paste detected'
        case EVENT_TYPES.SOURCE_DECLARED:
            return 'Source declared'
        case EVENT_TYPES.SUBMISSION_REFLECTION:
            return 'Submission reflection saved'
        default:
            return eventType || 'Provenance event'
    }
}
