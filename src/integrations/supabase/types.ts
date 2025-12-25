export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            activity_logs: {
                Row: {
                    action: string
                    cible: string | null
                    cible_id: string | null
                    date: string | null
                    details: Json | null
                    id: string
                    user_id: string
                }
                Insert: {
                    action: string
                    cible?: string | null
                    cible_id?: string | null
                    date?: string | null
                    details?: Json | null
                    id?: string
                    user_id: string
                }
                Update: {
                    action?: string
                    cible?: string | null
                    cible_id?: string | null
                    date?: string | null
                    details?: Json | null
                    id?: string
                    user_id?: string
                }
                Relationships: []
            }
            admin_invitations: {
                Row: {
                    accepted_at: string | null
                    created_at: string | null
                    email: string
                    expires_at: string
                    id: string
                    invitation_token: string
                    invited_by: string | null
                    is_used: boolean | null
                }
                Insert: {
                    accepted_at?: string | null
                    created_at?: string | null
                    email: string
                    expires_at: string
                    id?: string
                    invitation_token: string
                    invited_by?: string | null
                    is_used?: boolean | null
                }
                Update: {
                    accepted_at?: string | null
                    created_at?: string | null
                    email?: string
                    expires_at?: string
                    id?: string
                    invitation_token?: string
                    invited_by?: string | null
                    is_used?: boolean | null
                }
                Relationships: []
            }
            clients: {
                Row: {
                    created_at: string
                    email: string | null
                    id: string
                    nom: string
                    telephone: string | null
                    type: string | null
                    updated_at: string
                    organization_id: string | null
                }
                Insert: {
                    created_at?: string
                    email?: string | null
                    id?: string
                    nom: string
                    telephone?: string | null
                    type?: string | null
                    updated_at?: string
                    organization_id?: string | null
                }
                Update: {
                    created_at?: string
                    email?: string | null
                    id?: string
                    nom?: string
                    telephone?: string | null
                    type?: string | null
                    updated_at?: string
                    organization_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "clients_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            colis: {
                Row: {
                    client_id: string
                    contenu_description: string | null
                    created_at: string
                    created_by: string | null
                    date_arrivee_agence: string | null
                    date_expedition: string | null
                    fournisseur: string | null
                    id: string
                    montant_a_payer: number | null
                    notes: string | null
                    numero_commande: string | null
                    poids: number | null
                    statut: string
                    statut_paiement: string | null
                    tarif_kg: number | null
                    tracking_chine: string | null
                    transitaire_id: string | null
                    type_livraison: string
                    updated_at: string
                    quantite: number | null
                    organization_id: string | null
                }
                Insert: {
                    client_id: string
                    contenu_description?: string | null
                    created_at?: string
                    created_by?: string | null
                    date_arrivee_agence?: string | null
                    date_expedition?: string | null
                    fournisseur?: string | null
                    id?: string
                    montant_a_payer?: number | null
                    notes?: string | null
                    numero_commande?: string | null
                    poids?: number | null
                    statut?: string
                    statut_paiement?: string | null
                    tarif_kg?: number | null
                    tracking_chine?: string | null
                    transitaire_id?: string | null
                    type_livraison: string
                    updated_at?: string
                    quantite?: number | null
                    organization_id?: string | null
                }
                Update: {
                    client_id?: string
                    contenu_description?: string | null
                    created_at?: string
                    created_by?: string | null
                    date_arrivee_agence?: string | null
                    date_expedition?: string | null
                    fournisseur?: string | null
                    id?: string
                    montant_a_payer?: number | null
                    notes?: string | null
                    numero_commande?: string | null
                    poids?: number | null
                    statut?: string
                    statut_paiement?: string | null
                    tarif_kg?: number | null
                    tracking_chine?: string | null
                    transitaire_id?: string | null
                    type_livraison?: string
                    updated_at?: string
                    quantite?: number | null
                    organization_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "colis_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "clients"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "colis_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "colis_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "colis_transitaire_id_fkey"
                        columns: ["transitaire_id"]
                        isOneToOne: false
                        referencedRelation: "transitaires"
                        referencedColumns: ["id"]
                    }
                ]
            }
            colis_maritime: {
                Row: {
                    cbm: number | null
                    client_id: string
                    container_id: string | null
                    created_at: string | null
                    created_by: string | null
                    date_arrivee: string | null
                    date_chargement: string | null
                    date_livraison: string | null
                    date_reception_chine: string | null
                    description: string | null
                    id: string
                    montant_total: number | null
                    notes: string | null
                    organization_id: string | null
                    photos: string[] | null
                    poids: number | null
                    quantite: number | null
                    statut: string | null
                    statut_paiement: string | null
                    tarif_cbm: number | null
                    tracking_number: string | null
                    updated_at: string | null
                }
                Insert: {
                    cbm?: number | null
                    client_id: string
                    container_id?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    date_arrivee?: string | null
                    date_chargement?: string | null
                    date_livraison?: string | null
                    date_reception_chine?: string | null
                    description?: string | null
                    id?: string
                    montant_total?: number | null
                    notes?: string | null
                    organization_id?: string | null
                    photos?: string[] | null
                    poids?: number | null
                    quantite?: number | null
                    statut?: string | null
                    statut_paiement?: string | null
                    tarif_cbm?: number | null
                    tracking_number?: string | null
                    updated_at?: string | null
                }
                Update: {
                    cbm?: number | null
                    client_id?: string
                    container_id?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    date_arrivee?: string | null
                    date_chargement?: string | null
                    date_livraison?: string | null
                    date_reception_chine?: string | null
                    description?: string | null
                    id?: string
                    montant_total?: number | null
                    notes?: string | null
                    organization_id?: string | null
                    photos?: string[] | null
                    poids?: number | null
                    quantite?: number | null
                    statut?: string | null
                    statut_paiement?: string | null
                    tarif_cbm?: number | null
                    tracking_number?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "colis_maritime_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "clients"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "colis_maritime_container_id_fkey"
                        columns: ["container_id"]
                        isOneToOne: false
                        referencedRelation: "containers_maritime"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "colis_maritime_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "colis_maritime_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            comptes_financiers: {
                Row: {
                    created_at: string
                    description: string | null
                    devise: string
                    id: string
                    is_active: boolean | null
                    nom: string
                    solde_actuel: number
                    type: string | null
                    updated_at: string
                    organization_id: string | null
                }
                Insert: {
                    created_at?: string
                    description?: string | null
                    devise: string
                    id?: string
                    is_active?: boolean | null
                    nom: string
                    solde_actuel?: number
                    type?: string | null
                    updated_at?: string
                    organization_id?: string | null
                }
                Update: {
                    created_at?: string
                    description?: string | null
                    devise?: string
                    id?: string
                    is_active?: boolean | null
                    nom?: string
                    solde_actuel?: number
                    type?: string | null
                    updated_at?: string
                    organization_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "comptes_financiers_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            containers_maritime: {
                Row: {
                    bateau: string | null
                    created_at: string | null
                    created_by: string | null
                    date_arrivee_effective: string | null
                    date_arrivee_prevue: string | null
                    date_depart: string | null
                    id: string
                    notes: string | null
                    numero: string
                    numero_voyage: string | null
                    organization_id: string | null
                    statut: string | null
                    transitaire_id: string | null
                    updated_at: string | null
                }
                Insert: {
                    bateau?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    date_arrivee_effective?: string | null
                    date_arrivee_prevue?: string | null
                    date_depart?: string | null
                    id?: string
                    notes?: string | null
                    numero: string
                    numero_voyage?: string | null
                    organization_id?: string | null
                    statut?: string | null
                    transitaire_id?: string | null
                    updated_at?: string | null
                }
                Update: {
                    bateau?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    date_arrivee_effective?: string | null
                    date_arrivee_prevue?: string | null
                    date_depart?: string | null
                    id?: string
                    notes?: string | null
                    numero?: string
                    numero_voyage?: string | null
                    organization_id?: string | null
                    statut?: string | null
                    transitaire_id?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "containers_maritime_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "containers_maritime_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "containers_maritime_transitaire_id_fkey"
                        columns: ["transitaire_id"]
                        isOneToOne: false
                        referencedRelation: "transitaires"
                        referencedColumns: ["id"]
                    }
                ]
            }
            facture_items: {
                Row: {
                    created_at: string
                    description: string
                    facture_id: string
                    id: string
                    montant: number
                    quantite: number
                }
                Insert: {
                    created_at?: string
                    description: string
                    facture_id: string
                    id?: string
                    montant: number
                    quantite?: number
                }
                Update: {
                    created_at?: string
                    description?: string
                    facture_id?: string
                    id?: string
                    montant?: number
                    quantite?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "facture_items_facture_id_fkey"
                        columns: ["facture_id"]
                        isOneToOne: false
                        referencedRelation: "factures"
                        referencedColumns: ["id"]
                    }
                ]
            }
            factures: {
                Row: {
                    client_id: string
                    created_at: string
                    date_echeance: string | null
                    date_emission: string
                    devise: string
                    facture_number: string
                    id: string
                    notes: string | null
                    statut: string
                    total_general: number
                    updated_at: string
                    organization_id: string | null
                }
                Insert: {
                    client_id: string
                    created_at?: string
                    date_echeance?: string | null
                    date_emission?: string
                    devise?: string
                    facture_number: string
                    id?: string
                    notes?: string | null
                    statut?: string
                    total_general?: number
                    updated_at?: string
                    organization_id?: string | null
                }
                Update: {
                    client_id?: string
                    created_at?: string
                    date_echeance?: string | null
                    date_emission?: string
                    devise?: string
                    facture_number?: string
                    id?: string
                    notes?: string | null
                    statut?: string
                    total_general?: number
                    updated_at?: string
                    organization_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "factures_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "clients"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "factures_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            finance_categories: {
                Row: {
                    code: string
                    couleur: string | null
                    created_at: string | null
                    created_by: string | null
                    description: string | null
                    icon: string | null
                    id: string
                    is_active: boolean | null
                    nom: string
                    organization_id: string | null
                    type: string
                    updated_at: string | null
                }
                Insert: {
                    code: string
                    couleur?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    description?: string | null
                    icon?: string | null
                    id?: string
                    is_active?: boolean | null
                    nom: string
                    organization_id?: string | null
                    type: string
                    updated_at?: string | null
                }
                Update: {
                    code?: string
                    couleur?: string | null
                    created_at?: string | null
                    created_by?: string | null
                    description?: string | null
                    icon?: string | null
                    id?: string
                    is_active?: boolean | null
                    nom?: string
                    organization_id?: string | null
                    type?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "finance_categories_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "finance_categories_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            organizations: {
                Row: {
                    active: boolean | null
                    created_at: string | null
                    id: string
                    logo_url: string | null
                    nom: string
                    slug: string
                    updated_at: string | null
                }
                Insert: {
                    active?: boolean | null
                    created_at?: string | null
                    id?: string
                    logo_url?: string | null
                    nom: string
                    slug: string
                    updated_at?: string | null
                }
                Update: {
                    active?: boolean | null
                    created_at?: string | null
                    id?: string
                    logo_url?: string | null
                    nom?: string
                    slug?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    created_at: string | null
                    email: string | null
                    first_name: string | null
                    id: string
                    is_active: boolean | null
                    last_name: string | null
                    organization_id: string | null
                    phone: string | null
                    role: string | null
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string | null
                    email?: string | null
                    first_name?: string | null
                    id: string
                    is_active?: boolean | null
                    last_name?: string | null
                    organization_id?: string | null
                    phone?: string | null
                    role?: string | null
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string | null
                    email?: string | null
                    first_name?: string | null
                    id?: string
                    is_active?: boolean | null
                    last_name?: string | null
                    organization_id?: string | null
                    phone?: string | null
                    role?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            settings: {
                Row: {
                    categorie: string
                    cle: string
                    created_at: string
                    description: string | null
                    id: string
                    updated_at: string
                    valeur: string | null
                }
                Insert: {
                    categorie: string
                    cle: string
                    created_at?: string
                    description?: string | null
                    id?: string
                    updated_at?: string
                    valeur?: string | null
                }
                Update: {
                    categorie?: string
                    cle?: string
                    created_at?: string
                    description?: string | null
                    id?: string
                    updated_at?: string
                    valeur?: string | null
                }
                Relationships: []
            }
            transitaires: {
                Row: {
                    actif: boolean | null
                    created_at: string
                    delai_moyen_livraison: number | null
                    id: string
                    nom: string
                    nom_contact: string | null
                    note_interne: string | null
                    organization_id: string | null
                    services_offerts: string[] | null
                    specialisation_chine: boolean | null
                    specialisation_congo: boolean | null
                    tarif_base: number | null
                    telephone: string | null
                    updated_at: string
                    ville: string | null
                }
                Insert: {
                    actif?: boolean | null
                    created_at?: string
                    delai_moyen_livraison?: number | null
                    id?: string
                    nom: string
                    nom_contact?: string | null
                    note_interne?: string | null
                    organization_id?: string | null
                    services_offerts?: string[] | null
                    specialisation_chine?: boolean | null
                    specialisation_congo?: boolean | null
                    tarif_base?: number | null
                    telephone?: string | null
                    updated_at?: string
                    ville?: string | null
                }
                Update: {
                    actif?: boolean | null
                    created_at?: string
                    delai_moyen_livraison?: number | null
                    id?: string
                    nom?: string
                    nom_contact?: string | null
                    note_interne?: string | null
                    organization_id?: string | null
                    services_offerts?: string[] | null
                    specialisation_chine?: boolean | null
                    specialisation_congo?: boolean | null
                    tarif_base?: number | null
                    telephone?: string | null
                    updated_at?: string
                    ville?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "transitaires_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            transactions: {
                Row: {
                    benefice: number | null
                    categorie: string | null
                    client_id: string | null
                    colis_id: string | null
                    compte_destination_id: string | null
                    compte_source_id: string | null
                    created_at: string
                    created_by: string | null
                    date_paiement: string | null
                    devise: string
                    facture_id: string | null
                    frais: number | null
                    id: string
                    mode_paiement: string | null
                    montant: number
                    montant_cdf: number | null
                    montant_cny: number | null
                    motif: string | null
                    notes: string | null
                    organization_id: string | null
                    reference_preuve: string | null
                    statut: string
                    taux_usd_cdf: number | null
                    taux_usd_cny: number | null
                    type_transaction: string
                    updated_at: string
                }
                Insert: {
                    benefice?: number | null
                    categorie?: string | null
                    client_id?: string | null
                    colis_id?: string | null
                    compte_destination_id?: string | null
                    compte_source_id?: string | null
                    created_at?: string
                    created_by?: string | null
                    date_paiement?: string | null
                    devise: string
                    facture_id?: string | null
                    frais?: number | null
                    id?: string
                    mode_paiement?: string | null
                    montant: number
                    montant_cdf?: number | null
                    montant_cny?: number | null
                    motif?: string | null
                    notes?: string | null
                    organization_id?: string | null
                    reference_preuve?: string | null
                    statut?: string
                    taux_usd_cdf?: number | null
                    taux_usd_cny?: number | null
                    type_transaction: string
                    updated_at?: string
                }
                Update: {
                    benefice?: number | null
                    categorie?: string | null
                    client_id?: string | null
                    colis_id?: string | null
                    compte_destination_id?: string | null
                    compte_source_id?: string | null
                    created_at?: string
                    created_by?: string | null
                    date_paiement?: string | null
                    devise?: string
                    facture_id?: string | null
                    frais?: number | null
                    id?: string
                    mode_paiement?: string | null
                    montant?: number
                    montant_cdf?: number | null
                    montant_cny?: number | null
                    motif?: string | null
                    notes?: string | null
                    organization_id?: string | null
                    reference_preuve?: string | null
                    statut?: string
                    taux_usd_cdf?: number | null
                    taux_usd_cny?: number | null
                    type_transaction?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "transactions_client_id_fkey"
                        columns: ["client_id"]
                        isOneToOne: false
                        referencedRelation: "clients"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_colis_id_fkey"
                        columns: ["colis_id"]
                        isOneToOne: false
                        referencedRelation: "colis"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_compte_destination_id_fkey"
                        columns: ["compte_destination_id"]
                        isOneToOne: false
                        referencedRelation: "comptes_financiers"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_compte_source_id_fkey"
                        columns: ["compte_source_id"]
                        isOneToOne: false
                        referencedRelation: "comptes_financiers"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_facture_id_fkey"
                        columns: ["facture_id"]
                        isOneToOne: false
                        referencedRelation: "factures"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "transactions_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            webhook_logs: {
                Row: {
                    created_at: string | null
                    error_message: string | null
                    event_type: string
                    id: string
                    organization_id: string | null
                    payload: Json
                    status: string
                    webhook_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    error_message?: string | null
                    event_type: string
                    id?: string
                    organization_id?: string | null
                    payload: Json
                    status: string
                    webhook_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    error_message?: string | null
                    event_type?: string
                    id?: string
                    organization_id?: string | null
                    payload?: Json
                    status?: string
                    webhook_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "webhook_logs_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "webhook_logs_webhook_id_fkey"
                        columns: ["webhook_id"]
                        isOneToOne: false
                        referencedRelation: "webhooks"
                        referencedColumns: ["id"]
                    }
                ]
            }
            webhooks: {
                Row: {
                    created_at: string | null
                    description: string | null
                    events: string[]
                    id: string
                    is_active: boolean | null
                    organization_id: string | null
                    secret: string
                    updated_at: string | null
                    url: string
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    events: string[]
                    id?: string
                    is_active?: boolean | null
                    organization_id?: string | null
                    secret: string
                    updated_at?: string | null
                    url: string
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    events?: string[]
                    id?: string
                    is_active?: boolean | null
                    organization_id?: string | null
                    secret?: string
                    updated_at?: string | null
                    url?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "webhooks_organization_id_fkey"
                        columns: ["organization_id"]
                        isOneToOne: false
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            is_valid_email: {
                Args: {
                    email: string
                }
                Returns: boolean
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
