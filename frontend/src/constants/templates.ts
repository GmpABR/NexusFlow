export interface BoardTemplate {
    name: string;
    description: string;
    columns: string[];
    icon?: string;
}

export const BOARD_TEMPLATES: Record<string, BoardTemplate> = {
    blank: {
        name: 'Blank Board',
        description: 'Start with a clean slate',
        columns: [],
    },
    kanban: {
        name: 'Kanban',
        description: 'Standard To Do, In Progress, Done workflow',
        columns: ['To Do', 'In Progress', 'Done'],
    },
    scrum: {
        name: 'Scrum',
        description: 'Manage sprints and backlogs',
        columns: ['Backlog', 'Sprint Backlog', 'In Progress', 'Review', 'Done'],
    },
    agile: {
        name: 'Agile',
        description: 'Flexible agile project management',
        columns: ['Backlog', 'Ready', 'In Progress', 'Testing', 'Done'],
    },
    crm: {
        name: 'Sales CRM',
        description: 'Track deals through the pipeline',
        columns: ['Leads', 'Contacted', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
    },
    marketing: {
        name: 'Marketing Campaign',
        description: 'Plan and execute marketing efforts',
        columns: ['Ideation', 'Content Creation', 'Review', 'Scheduled', 'Published', 'Analysis'],
    },
    product: {
        name: 'Product Roadmap',
        description: 'Plan your product strategy',
        columns: ['Now', 'Next', 'Later', 'Completed'],
    },
};

export type TemplateType = keyof typeof BOARD_TEMPLATES;
