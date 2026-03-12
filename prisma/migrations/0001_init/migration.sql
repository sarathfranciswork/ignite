-- CreateEnum
CREATE TYPE "global_role" AS ENUM ('PLATFORM_ADMIN', 'INNOVATION_MANAGER', 'MEMBER', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "notification_frequency" AS ENUM ('IMMEDIATE', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "external_invitation_status" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "resource_role_type" AS ENUM ('CAMPAIGN_MANAGER', 'CAMPAIGN_COACH', 'CAMPAIGN_CONTRIBUTOR', 'CAMPAIGN_MODERATOR', 'CAMPAIGN_EVALUATOR', 'CAMPAIGN_SEEDER', 'CAMPAIGN_SPONSOR', 'CHANNEL_MANAGER', 'CHANNEL_CONTRIBUTOR');

-- CreateEnum
CREATE TYPE "coach_assignment_mode" AS ENUM ('GLOBAL', 'PER_CATEGORY');

-- CreateEnum
CREATE TYPE "space_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "space_role" AS ENUM ('SPACE_ADMIN', 'SPACE_MANAGER', 'SPACE_MEMBER');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('DRAFT', 'SEEDING', 'SUBMISSION', 'DISCUSSION_VOTING', 'EVALUATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "submission_type" AS ENUM ('CALL_FOR_IDEAS', 'CALL_FOR_PROPOSALS', 'CALL_FOR_GENERIC', 'PARTNERSHIP_PROPOSALS');

-- CreateEnum
CREATE TYPE "setup_type" AS ENUM ('SIMPLE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "audience_type" AS ENUM ('ALL_INTERNAL', 'SELECTED_INTERNAL', 'ALL_EXTERNAL', 'SELECTED_EXTERNAL', 'MIXED');

-- CreateEnum
CREATE TYPE "channel_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "idea_status" AS ENUM ('DRAFT', 'QUALIFICATION', 'COMMUNITY_DISCUSSION', 'HOT', 'EVALUATION', 'SELECTED_IMPLEMENTATION', 'IMPLEMENTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "org_relationship_status" AS ENUM ('IDENTIFIED', 'VERIFIED', 'QUALIFIED', 'EVALUATION', 'PILOT', 'PARTNERSHIP', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "nda_status" AS ENUM ('NONE', 'REQUESTED', 'SIGNED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "invitation_status" AS ENUM ('NOT_INVITED', 'INVITED', 'REGISTERED');

-- CreateEnum
CREATE TYPE "org_manager_role" AS ENUM ('INTERNAL_MANAGER', 'EXTERNAL_PRIMARY');

-- CreateEnum
CREATE TYPE "use_case_status" AS ENUM ('IDENTIFIED', 'QUALIFICATION', 'EVALUATION', 'PILOT', 'PARTNERSHIP', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "use_case_task_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "use_case_team_role" AS ENUM ('LEAD', 'MEMBER');

-- CreateEnum
CREATE TYPE "scouting_board_column_type" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'DATE');

-- CreateEnum
CREATE TYPE "scouting_board_share_role" AS ENUM ('VIEWER', 'EDITOR');

-- CreateEnum
CREATE TYPE "scouting_mission_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "sso_provider_type" AS ENUM ('SAML', 'LDAP');

-- CreateEnum
CREATE TYPE "sso_group_mapping_target_type" AS ENUM ('GLOBAL_ROLE', 'USER_GROUP');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('IDEA_SUBMITTED', 'EVALUATION_REQUESTED', 'STATUS_CHANGE', 'HOT_GRADUATION', 'CAMPAIGN_PHASE_CHANGE', 'COMMENT_ON_FOLLOWED', 'MENTION');

-- CreateEnum
CREATE TYPE "activity_event_type" AS ENUM ('IDEA_SUBMITTED', 'IDEA_TRANSITIONED', 'IDEA_STATUS_CHANGED', 'IDEA_ARCHIVED', 'IDEA_UNARCHIVED', 'COMMENT_CREATED', 'IDEA_LIKED', 'IDEA_VOTED', 'IDEA_FOLLOWED', 'IDEA_COACH_QUALIFIED', 'IDEA_COACH_REJECTED', 'IDEA_COACH_REQUESTED_CHANGES', 'IDEA_SPLIT', 'IDEA_MERGED', 'IDEA_BULK_ARCHIVED', 'IDEA_BULK_BUCKET_ASSIGNED', 'IDEA_BULK_EXPORTED');

-- CreateEnum
CREATE TYPE "bucket_type" AS ENUM ('MANUAL', 'SMART');

-- CreateEnum
CREATE TYPE "evaluation_session_status" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "evaluation_session_type" AS ENUM ('SCORECARD', 'PAIRWISE');

-- CreateEnum
CREATE TYPE "criterion_field_type" AS ENUM ('SELECTION_SCALE', 'TEXT', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "shortlist_forward_target" AS ENUM ('SELECTED_IMPLEMENTATION', 'CONCEPT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TrendType" AS ENUM ('MEGA', 'MACRO', 'MICRO');

-- CreateEnum
CREATE TYPE "insight_type" AS ENUM ('SIGNAL', 'OBSERVATION', 'OPPORTUNITY', 'RISK');

-- CreateEnum
CREATE TYPE "insight_scope" AS ENUM ('GLOBAL', 'CAMPAIGN', 'TREND');

-- CreateEnum
CREATE TYPE "MaturityLevel" AS ENUM ('EMERGING', 'GROWING', 'MATURE', 'DECLINING');

-- CreateEnum
CREATE TYPE "portfolio_item_type" AS ENUM ('TREND', 'TECHNOLOGY', 'IDEA', 'SIA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "global_role" "global_role" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "bio" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notification_frequency" "notification_frequency" NOT NULL DEFAULT 'IMMEDIATE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "external_campaign_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scim_external_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "external_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviter_user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "external_invitation_status" NOT NULL DEFAULT 'PENDING',
    "campaign_ids" TEXT[],
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "role" "resource_role_type" NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "resource_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_org_units" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_unit_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_org_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_group_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_group_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "innovation_spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "status" "space_status" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "innovation_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "innovation_space_memberships" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "space_role" NOT NULL DEFAULT 'SPACE_MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "innovation_space_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "teaser" TEXT,
    "description" TEXT,
    "banner_url" TEXT,
    "video_url" TEXT,
    "status" "campaign_status" NOT NULL DEFAULT 'DRAFT',
    "previous_status" "campaign_status",
    "submission_type" "submission_type" NOT NULL DEFAULT 'CALL_FOR_IDEAS',
    "setup_type" "setup_type" NOT NULL DEFAULT 'SIMPLE',
    "audience_type" "audience_type" NOT NULL DEFAULT 'ALL_INTERNAL',
    "submission_close_date" TIMESTAMP(3),
    "voting_close_date" TIMESTAMP(3),
    "planned_close_date" TIMESTAMP(3),
    "launched_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "has_seeding_phase" BOOLEAN NOT NULL DEFAULT true,
    "has_discussion_phase" BOOLEAN NOT NULL DEFAULT true,
    "has_community_graduation" BOOLEAN NOT NULL DEFAULT true,
    "has_qualification_phase" BOOLEAN NOT NULL DEFAULT false,
    "has_voting" BOOLEAN NOT NULL DEFAULT false,
    "has_likes" BOOLEAN NOT NULL DEFAULT true,
    "has_idea_coach" BOOLEAN NOT NULL DEFAULT false,
    "is_confidential_allowed" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_show_on_start_page" BOOLEAN NOT NULL DEFAULT true,
    "coach_assignment_mode" "coach_assignment_mode" NOT NULL DEFAULT 'GLOBAL',
    "idea_categories" JSONB,
    "graduation_visitors" INTEGER NOT NULL DEFAULT 10,
    "graduation_commenters" INTEGER NOT NULL DEFAULT 5,
    "graduation_likes" INTEGER NOT NULL DEFAULT 0,
    "graduation_voters" INTEGER NOT NULL DEFAULT 0,
    "graduation_voting_level" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "graduation_days_in_status" INTEGER NOT NULL DEFAULT 0,
    "voting_criteria" JSONB,
    "custom_fields" JSONB,
    "settings" JSONB,
    "created_by_id" TEXT NOT NULL,
    "sia_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_sia_links" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "sia_id" TEXT NOT NULL,

    CONSTRAINT "campaign_sia_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_members" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "resource_role_type" NOT NULL,
    "category" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "campaign_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_kpi_snapshots" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "total_views" INTEGER NOT NULL DEFAULT 0,
    "unique_visitors" INTEGER NOT NULL DEFAULT 0,
    "total_participants" INTEGER NOT NULL DEFAULT 0,
    "ideas_submitted" INTEGER NOT NULL DEFAULT 0,
    "ideas_qualified" INTEGER NOT NULL DEFAULT 0,
    "ideas_hot" INTEGER NOT NULL DEFAULT 0,
    "ideas_evaluated" INTEGER NOT NULL DEFAULT 0,
    "ideas_selected" INTEGER NOT NULL DEFAULT 0,
    "total_comments" INTEGER NOT NULL DEFAULT 0,
    "total_votes" INTEGER NOT NULL DEFAULT 0,
    "total_likes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_kpi_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "teaser" TEXT,
    "description" TEXT,
    "problem_statement" TEXT,
    "banner_url" TEXT,
    "status" "channel_status" NOT NULL DEFAULT 'ACTIVE',
    "has_qualification_phase" BOOLEAN NOT NULL DEFAULT false,
    "has_discussion_phase" BOOLEAN NOT NULL DEFAULT true,
    "has_voting" BOOLEAN NOT NULL DEFAULT false,
    "has_likes" BOOLEAN NOT NULL DEFAULT true,
    "voting_criteria" JSONB,
    "custom_fields" JSONB,
    "settings" JSONB,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_members" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "resource_role_type" NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ideas" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "teaser" TEXT,
    "description" TEXT,
    "status" "idea_status" NOT NULL DEFAULT 'DRAFT',
    "previous_status" "idea_status",
    "campaign_id" TEXT NOT NULL,
    "contributor_id" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "custom_field_values" JSONB,
    "attachments" JSONB,
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "invention_disclosure" BOOLEAN NOT NULL DEFAULT false,
    "search_vector" tsvector,
    "embedding" vector(384),
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "split_from_id" TEXT,
    "merged_into_id" TEXT,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_co_authors" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "idea_co_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_merge_history" (
    "id" TEXT NOT NULL,
    "target_idea_id" TEXT NOT NULL,
    "source_idea_id" TEXT NOT NULL,
    "merged_by_id" TEXT NOT NULL,
    "source_title" TEXT NOT NULL,
    "source_teaser" TEXT,
    "merged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_merge_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_likes" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_votes" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "criterion_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idea_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_follows" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_mentions" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "mentioned_user_id" TEXT NOT NULL,

    CONSTRAINT "comment_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website_url" TEXT,
    "logo_url" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "founded_year" INTEGER,
    "employee_count" TEXT,
    "funding_stage" TEXT,
    "funding_total" TEXT,
    "relationship_status" "org_relationship_status" NOT NULL DEFAULT 'IDENTIFIED',
    "nda_status" "nda_status" NOT NULL DEFAULT 'NONE',
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "crunchbase_id" TEXT,
    "innospot_id" TEXT,
    "custom_fields" JSONB,
    "management_team" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_managers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "org_manager_role" NOT NULL DEFAULT 'INTERNAL_MANAGER',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "invitation_status" "invitation_status" NOT NULL DEFAULT 'NOT_INVITED',
    "linked_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "use_cases" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problem_description" TEXT,
    "suggested_solution" TEXT,
    "benefit" TEXT,
    "status" "use_case_status" NOT NULL DEFAULT 'IDENTIFIED',
    "previous_status" "use_case_status",
    "owner_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "use_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "use_case_team_members" (
    "id" TEXT NOT NULL,
    "use_case_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "use_case_team_role" NOT NULL DEFAULT 'MEMBER',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "use_case_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "use_case_organizations" (
    "id" TEXT NOT NULL,
    "use_case_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "use_case_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "use_case_tasks" (
    "id" TEXT NOT NULL,
    "use_case_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "use_case_task_status" NOT NULL DEFAULT 'OPEN',
    "assignee_id" TEXT,
    "due_date" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "use_case_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scouting_boards" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scouting_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scouting_board_columns" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "scouting_board_column_type" NOT NULL DEFAULT 'TEXT',
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scouting_board_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scouting_board_cards" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "column_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "custom_values" JSONB,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scouting_board_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scouting_board_shares" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "scouting_board_share_role" NOT NULL DEFAULT 'VIEWER',
    "shared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scouting_board_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scouting_missions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problem_statement" TEXT NOT NULL,
    "requirements" JSONB,
    "target_industries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deadline" TIMESTAMP(3),
    "status" "scouting_mission_status" NOT NULL DEFAULT 'OPEN',
    "previous_status" "scouting_mission_status",
    "created_by_id" TEXT NOT NULL,
    "board_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scouting_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scouting_mission_scouts" (
    "id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scouting_mission_scouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "white_label_configs" (
    "id" TEXT NOT NULL,
    "platform_name" TEXT NOT NULL DEFAULT 'Ignite',
    "logo_url" TEXT,
    "logo_small_url" TEXT,
    "favicon_url" TEXT,
    "login_banner_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#6366F1',
    "secondary_color" TEXT NOT NULL DEFAULT '#8B5CF6',
    "accent_color" TEXT NOT NULL DEFAULT '#EC4899',
    "custom_domain" TEXT,
    "login_welcome_title" TEXT,
    "login_welcome_message" TEXT,
    "email_logo_url" TEXT,
    "email_primary_color" TEXT NOT NULL DEFAULT '#6366F1',
    "email_footer_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "white_label_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "email_subject" TEXT NOT NULL,
    "email_body" TEXT NOT NULL,
    "in_app_title" TEXT NOT NULL,
    "in_app_body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "sso_provider_type" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "display_name" TEXT NOT NULL,
    "saml_entity_id" TEXT,
    "saml_sso_url" TEXT,
    "saml_slo_url" TEXT,
    "saml_certificate" TEXT,
    "saml_metadata_url" TEXT,
    "saml_sign_requests" BOOLEAN NOT NULL DEFAULT false,
    "saml_want_assertions_signed" BOOLEAN NOT NULL DEFAULT true,
    "ldap_url" TEXT,
    "ldap_bind_dn" TEXT,
    "ldap_bind_credential" TEXT,
    "ldap_search_base" TEXT,
    "ldap_search_filter" TEXT,
    "ldap_use_tls" BOOLEAN NOT NULL DEFAULT false,
    "ldap_group_search_base" TEXT,
    "ldap_group_search_filter" TEXT,
    "auto_provision_users" BOOLEAN NOT NULL DEFAULT true,
    "default_role" "global_role" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_attribute_mappings" (
    "id" TEXT NOT NULL,
    "sso_provider_id" TEXT NOT NULL,
    "source_attribute" TEXT NOT NULL,
    "target_field" TEXT NOT NULL,

    CONSTRAINT "sso_attribute_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_group_mappings" (
    "id" TEXT NOT NULL,
    "sso_provider_id" TEXT NOT NULL,
    "external_group" TEXT NOT NULL,
    "target_type" "sso_group_mapping_target_type" NOT NULL,
    "target_value" TEXT NOT NULL,

    CONSTRAINT "sso_group_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "event_type" "activity_event_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buckets" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "type" "bucket_type" NOT NULL DEFAULT 'MANUAL',
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "filter_criteria" JSONB,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_bucket_assignments" (
    "id" TEXT NOT NULL,
    "bucket_id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_bucket_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_sessions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "evaluation_session_type" NOT NULL,
    "status" "evaluation_session_status" NOT NULL DEFAULT 'DRAFT',
    "due_date" TIMESTAMP(3),
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "template_id" TEXT,
    "shortlist_locked" BOOLEAN NOT NULL DEFAULT false,
    "shortlist_locked_at" TIMESTAMP(3),
    "shortlist_locked_by_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_criteria" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "guidance_text" TEXT,
    "field_type" "criterion_field_type" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "scale_min" INTEGER,
    "scale_max" INTEGER,
    "scale_labels" JSONB,
    "visible_when" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_session_evaluators" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "evaluation_session_evaluators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_session_ideas" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_session_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_responses" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "criterion_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "score_value" INTEGER,
    "text_value" TEXT,
    "bool_value" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_shortlist_items" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "idea_id" TEXT NOT NULL,
    "added_by_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forwarded_to" "shortlist_forward_target",
    "forwarded_at" TIMESTAMP(3),

    CONSTRAINT "evaluation_shortlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pairwise_comparisons" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "criterion_id" TEXT NOT NULL,
    "idea_a_id" TEXT NOT NULL,
    "idea_b_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pairwise_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic_innovation_areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "banner_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_innovation_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trends" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "source_url" TEXT,
    "type" "TrendType" NOT NULL DEFAULT 'MICRO',
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_community_submitted" BOOLEAN NOT NULL DEFAULT false,
    "trend_one_id" TEXT,
    "business_relevance" DOUBLE PRECISION,
    "parent_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_sia_links" (
    "id" TEXT NOT NULL,
    "trend_id" TEXT NOT NULL,
    "sia_id" TEXT NOT NULL,

    CONSTRAINT "trend_sia_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "insight_type" NOT NULL DEFAULT 'SIGNAL',
    "scope" "insight_scope" NOT NULL DEFAULT 'GLOBAL',
    "source_url" TEXT,
    "is_editorial" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_insight_links" (
    "id" TEXT NOT NULL,
    "trend_id" TEXT NOT NULL,
    "insight_id" TEXT NOT NULL,

    CONSTRAINT "trend_insight_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technologies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "source_url" TEXT,
    "maturity_level" "MaturityLevel",
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tech_sia_links" (
    "id" TEXT NOT NULL,
    "tech_id" TEXT NOT NULL,
    "sia_id" TEXT NOT NULL,

    CONSTRAINT "tech_sia_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "innovation_portfolios" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "innovation_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "entity_type" "portfolio_item_type" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "bucket_label" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scim_tokens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scim_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_scim_external_id_key" ON "users"("scim_external_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "external_invitations_token_key" ON "external_invitations"("token");

-- CreateIndex
CREATE INDEX "external_invitations_email_idx" ON "external_invitations"("email");

-- CreateIndex
CREATE INDEX "external_invitations_token_idx" ON "external_invitations"("token");

-- CreateIndex
CREATE INDEX "external_invitations_status_idx" ON "external_invitations"("status");

-- CreateIndex
CREATE INDEX "resource_roles_user_id_idx" ON "resource_roles"("user_id");

-- CreateIndex
CREATE INDEX "resource_roles_resource_id_idx" ON "resource_roles"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_roles_user_id_resource_id_role_key" ON "resource_roles"("user_id", "resource_id", "role");

-- CreateIndex
CREATE INDEX "user_org_units_user_id_idx" ON "user_org_units"("user_id");

-- CreateIndex
CREATE INDEX "user_org_units_org_unit_id_idx" ON "user_org_units"("org_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_org_units_user_id_org_unit_id_key" ON "user_org_units"("user_id", "org_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_groups_name_key" ON "user_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_group_memberships_user_id_group_id_key" ON "user_group_memberships"("user_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "innovation_spaces_slug_key" ON "innovation_spaces"("slug");

-- CreateIndex
CREATE INDEX "innovation_spaces_status_idx" ON "innovation_spaces"("status");

-- CreateIndex
CREATE INDEX "innovation_spaces_slug_idx" ON "innovation_spaces"("slug");

-- CreateIndex
CREATE INDEX "innovation_space_memberships_space_id_idx" ON "innovation_space_memberships"("space_id");

-- CreateIndex
CREATE INDEX "innovation_space_memberships_user_id_idx" ON "innovation_space_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "innovation_space_memberships_space_id_user_id_key" ON "innovation_space_memberships"("space_id", "user_id");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_submission_type_idx" ON "campaigns"("submission_type");

-- CreateIndex
CREATE INDEX "campaigns_created_by_id_idx" ON "campaigns"("created_by_id");

-- CreateIndex
CREATE INDEX "campaigns_sia_id_idx" ON "campaigns"("sia_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_sia_links_campaign_id_sia_id_key" ON "campaign_sia_links"("campaign_id", "sia_id");

-- CreateIndex
CREATE INDEX "campaign_members_campaign_id_idx" ON "campaign_members"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_members_user_id_idx" ON "campaign_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_members_campaign_id_user_id_role_key" ON "campaign_members"("campaign_id", "user_id", "role");

-- CreateIndex
CREATE INDEX "campaign_kpi_snapshots_campaign_id_idx" ON "campaign_kpi_snapshots"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_kpi_snapshots_snapshot_date_idx" ON "campaign_kpi_snapshots"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_kpi_snapshots_campaign_id_snapshot_date_key" ON "campaign_kpi_snapshots"("campaign_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "channels_status_idx" ON "channels"("status");

-- CreateIndex
CREATE INDEX "channels_created_by_id_idx" ON "channels"("created_by_id");

-- CreateIndex
CREATE INDEX "channel_members_channel_id_idx" ON "channel_members"("channel_id");

-- CreateIndex
CREATE INDEX "channel_members_user_id_idx" ON "channel_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_members_channel_id_user_id_role_key" ON "channel_members"("channel_id", "user_id", "role");

-- CreateIndex
CREATE INDEX "ideas_campaign_id_idx" ON "ideas"("campaign_id");

-- CreateIndex
CREATE INDEX "ideas_contributor_id_idx" ON "ideas"("contributor_id");

-- CreateIndex
CREATE INDEX "ideas_status_idx" ON "ideas"("status");

-- CreateIndex
CREATE INDEX "ideas_campaign_id_status_idx" ON "ideas"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "ideas_search_vector_idx" ON "ideas" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "ideas_split_from_id_idx" ON "ideas"("split_from_id");

-- CreateIndex
CREATE INDEX "ideas_merged_into_id_idx" ON "ideas"("merged_into_id");

-- CreateIndex
CREATE INDEX "idea_co_authors_idea_id_idx" ON "idea_co_authors"("idea_id");

-- CreateIndex
CREATE INDEX "idea_co_authors_user_id_idx" ON "idea_co_authors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idea_co_authors_idea_id_user_id_key" ON "idea_co_authors"("idea_id", "user_id");

-- CreateIndex
CREATE INDEX "idea_merge_history_target_idea_id_idx" ON "idea_merge_history"("target_idea_id");

-- CreateIndex
CREATE INDEX "idea_merge_history_source_idea_id_idx" ON "idea_merge_history"("source_idea_id");

-- CreateIndex
CREATE INDEX "idea_likes_idea_id_idx" ON "idea_likes"("idea_id");

-- CreateIndex
CREATE INDEX "idea_likes_user_id_idx" ON "idea_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idea_likes_idea_id_user_id_key" ON "idea_likes"("idea_id", "user_id");

-- CreateIndex
CREATE INDEX "idea_votes_idea_id_idx" ON "idea_votes"("idea_id");

-- CreateIndex
CREATE INDEX "idea_votes_user_id_idx" ON "idea_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idea_votes_idea_id_user_id_criterion_id_key" ON "idea_votes"("idea_id", "user_id", "criterion_id");

-- CreateIndex
CREATE INDEX "idea_follows_idea_id_idx" ON "idea_follows"("idea_id");

-- CreateIndex
CREATE INDEX "idea_follows_user_id_idx" ON "idea_follows"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idea_follows_idea_id_user_id_key" ON "idea_follows"("idea_id", "user_id");

-- CreateIndex
CREATE INDEX "comments_idea_id_idx" ON "comments"("idea_id");

-- CreateIndex
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");

-- CreateIndex
CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");

-- CreateIndex
CREATE INDEX "comments_idea_id_created_at_idx" ON "comments"("idea_id", "created_at");

-- CreateIndex
CREATE INDEX "comment_mentions_comment_id_idx" ON "comment_mentions"("comment_id");

-- CreateIndex
CREATE INDEX "comment_mentions_mentioned_user_id_idx" ON "comment_mentions"("mentioned_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_mentions_comment_id_mentioned_user_id_key" ON "comment_mentions"("comment_id", "mentioned_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_crunchbase_id_key" ON "organizations"("crunchbase_id");

-- CreateIndex
CREATE INDEX "organizations_relationship_status_idx" ON "organizations"("relationship_status");

-- CreateIndex
CREATE INDEX "organizations_name_idx" ON "organizations"("name");

-- CreateIndex
CREATE INDEX "organizations_is_archived_idx" ON "organizations"("is_archived");

-- CreateIndex
CREATE INDEX "organization_managers_organization_id_idx" ON "organization_managers"("organization_id");

-- CreateIndex
CREATE INDEX "organization_managers_user_id_idx" ON "organization_managers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_managers_organization_id_user_id_key" ON "organization_managers"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "contacts_organization_id_idx" ON "contacts"("organization_id");

-- CreateIndex
CREATE INDEX "contacts_linked_user_id_idx" ON "contacts"("linked_user_id");

-- CreateIndex
CREATE INDEX "use_cases_status_idx" ON "use_cases"("status");

-- CreateIndex
CREATE INDEX "use_cases_owner_id_idx" ON "use_cases"("owner_id");

-- CreateIndex
CREATE INDEX "use_cases_created_by_id_idx" ON "use_cases"("created_by_id");

-- CreateIndex
CREATE INDEX "use_case_team_members_use_case_id_idx" ON "use_case_team_members"("use_case_id");

-- CreateIndex
CREATE INDEX "use_case_team_members_user_id_idx" ON "use_case_team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "use_case_team_members_use_case_id_user_id_key" ON "use_case_team_members"("use_case_id", "user_id");

-- CreateIndex
CREATE INDEX "use_case_organizations_use_case_id_idx" ON "use_case_organizations"("use_case_id");

-- CreateIndex
CREATE INDEX "use_case_organizations_organization_id_idx" ON "use_case_organizations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "use_case_organizations_use_case_id_organization_id_key" ON "use_case_organizations"("use_case_id", "organization_id");

-- CreateIndex
CREATE INDEX "use_case_tasks_use_case_id_idx" ON "use_case_tasks"("use_case_id");

-- CreateIndex
CREATE INDEX "use_case_tasks_assignee_id_idx" ON "use_case_tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "use_case_tasks_use_case_id_status_idx" ON "use_case_tasks"("use_case_id", "status");

-- CreateIndex
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");

-- CreateIndex
CREATE INDEX "scouting_boards_created_by_id_idx" ON "scouting_boards"("created_by_id");

-- CreateIndex
CREATE INDEX "scouting_boards_is_archived_idx" ON "scouting_boards"("is_archived");

-- CreateIndex
CREATE INDEX "scouting_board_columns_board_id_idx" ON "scouting_board_columns"("board_id");

-- CreateIndex
CREATE INDEX "scouting_board_columns_board_id_sort_order_idx" ON "scouting_board_columns"("board_id", "sort_order");

-- CreateIndex
CREATE INDEX "scouting_board_cards_board_id_idx" ON "scouting_board_cards"("board_id");

-- CreateIndex
CREATE INDEX "scouting_board_cards_column_id_idx" ON "scouting_board_cards"("column_id");

-- CreateIndex
CREATE INDEX "scouting_board_cards_organization_id_idx" ON "scouting_board_cards"("organization_id");

-- CreateIndex
CREATE INDEX "scouting_board_cards_board_id_column_id_sort_order_idx" ON "scouting_board_cards"("board_id", "column_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "scouting_board_cards_board_id_organization_id_key" ON "scouting_board_cards"("board_id", "organization_id");

-- CreateIndex
CREATE INDEX "scouting_board_shares_board_id_idx" ON "scouting_board_shares"("board_id");

-- CreateIndex
CREATE INDEX "scouting_board_shares_user_id_idx" ON "scouting_board_shares"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scouting_board_shares_board_id_user_id_key" ON "scouting_board_shares"("board_id", "user_id");

-- CreateIndex
CREATE INDEX "scouting_missions_created_by_id_idx" ON "scouting_missions"("created_by_id");

-- CreateIndex
CREATE INDEX "scouting_missions_status_idx" ON "scouting_missions"("status");

-- CreateIndex
CREATE INDEX "scouting_missions_deadline_idx" ON "scouting_missions"("deadline");

-- CreateIndex
CREATE INDEX "scouting_mission_scouts_mission_id_idx" ON "scouting_mission_scouts"("mission_id");

-- CreateIndex
CREATE INDEX "scouting_mission_scouts_user_id_idx" ON "scouting_mission_scouts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scouting_mission_scouts_mission_id_user_id_key" ON "scouting_mission_scouts"("mission_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "white_label_configs_custom_domain_key" ON "white_label_configs"("custom_domain");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_type_key" ON "notification_templates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "sso_providers_type_idx" ON "sso_providers"("type");

-- CreateIndex
CREATE INDEX "sso_providers_is_enabled_idx" ON "sso_providers"("is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "sso_providers_name_key" ON "sso_providers"("name");

-- CreateIndex
CREATE INDEX "sso_attribute_mappings_sso_provider_id_idx" ON "sso_attribute_mappings"("sso_provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "sso_attribute_mappings_sso_provider_id_target_field_key" ON "sso_attribute_mappings"("sso_provider_id", "target_field");

-- CreateIndex
CREATE INDEX "sso_group_mappings_sso_provider_id_idx" ON "sso_group_mappings"("sso_provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "sso_group_mappings_sso_provider_id_external_group_target_ty_key" ON "sso_group_mappings"("sso_provider_id", "external_group", "target_type");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_entity_type_entity_id_idx" ON "notifications"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_events_idea_id_created_at_idx" ON "activity_events"("idea_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_events_campaign_id_created_at_idx" ON "activity_events"("campaign_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_events_actor_id_idx" ON "activity_events"("actor_id");

-- CreateIndex
CREATE INDEX "buckets_campaign_id_idx" ON "buckets"("campaign_id");

-- CreateIndex
CREATE INDEX "buckets_campaign_id_sort_order_idx" ON "buckets"("campaign_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "buckets_campaign_id_name_key" ON "buckets"("campaign_id", "name");

-- CreateIndex
CREATE INDEX "idea_bucket_assignments_bucket_id_idx" ON "idea_bucket_assignments"("bucket_id");

-- CreateIndex
CREATE INDEX "idea_bucket_assignments_idea_id_idx" ON "idea_bucket_assignments"("idea_id");

-- CreateIndex
CREATE INDEX "idea_bucket_assignments_bucket_id_sort_order_idx" ON "idea_bucket_assignments"("bucket_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "idea_bucket_assignments_bucket_id_idea_id_key" ON "idea_bucket_assignments"("bucket_id", "idea_id");

-- CreateIndex
CREATE INDEX "evaluation_sessions_campaign_id_idx" ON "evaluation_sessions"("campaign_id");

-- CreateIndex
CREATE INDEX "evaluation_sessions_status_idx" ON "evaluation_sessions"("status");

-- CreateIndex
CREATE INDEX "evaluation_sessions_created_by_id_idx" ON "evaluation_sessions"("created_by_id");

-- CreateIndex
CREATE INDEX "evaluation_sessions_campaign_id_status_idx" ON "evaluation_sessions"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "evaluation_criteria_session_id_idx" ON "evaluation_criteria"("session_id");

-- CreateIndex
CREATE INDEX "evaluation_criteria_session_id_sort_order_idx" ON "evaluation_criteria"("session_id", "sort_order");

-- CreateIndex
CREATE INDEX "evaluation_session_evaluators_session_id_idx" ON "evaluation_session_evaluators"("session_id");

-- CreateIndex
CREATE INDEX "evaluation_session_evaluators_user_id_idx" ON "evaluation_session_evaluators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_session_evaluators_session_id_user_id_key" ON "evaluation_session_evaluators"("session_id", "user_id");

-- CreateIndex
CREATE INDEX "evaluation_session_ideas_session_id_idx" ON "evaluation_session_ideas"("session_id");

-- CreateIndex
CREATE INDEX "evaluation_session_ideas_idea_id_idx" ON "evaluation_session_ideas"("idea_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_session_ideas_session_id_idea_id_key" ON "evaluation_session_ideas"("session_id", "idea_id");

-- CreateIndex
CREATE INDEX "evaluation_responses_session_id_idx" ON "evaluation_responses"("session_id");

-- CreateIndex
CREATE INDEX "evaluation_responses_evaluator_id_idx" ON "evaluation_responses"("evaluator_id");

-- CreateIndex
CREATE INDEX "evaluation_responses_idea_id_idx" ON "evaluation_responses"("idea_id");

-- CreateIndex
CREATE INDEX "evaluation_responses_session_id_idea_id_idx" ON "evaluation_responses"("session_id", "idea_id");

-- CreateIndex
CREATE INDEX "evaluation_responses_session_id_evaluator_id_idx" ON "evaluation_responses"("session_id", "evaluator_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_responses_session_id_criterion_id_evaluator_id_i_key" ON "evaluation_responses"("session_id", "criterion_id", "evaluator_id", "idea_id");

-- CreateIndex
CREATE INDEX "evaluation_shortlist_items_session_id_idx" ON "evaluation_shortlist_items"("session_id");

-- CreateIndex
CREATE INDEX "evaluation_shortlist_items_idea_id_idx" ON "evaluation_shortlist_items"("idea_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_shortlist_items_session_id_idea_id_key" ON "evaluation_shortlist_items"("session_id", "idea_id");

-- CreateIndex
CREATE INDEX "pairwise_comparisons_session_id_idx" ON "pairwise_comparisons"("session_id");

-- CreateIndex
CREATE INDEX "pairwise_comparisons_session_id_evaluator_id_idx" ON "pairwise_comparisons"("session_id", "evaluator_id");

-- CreateIndex
CREATE UNIQUE INDEX "pairwise_comparisons_session_id_evaluator_id_criterion_id_i_key" ON "pairwise_comparisons"("session_id", "evaluator_id", "criterion_id", "idea_a_id", "idea_b_id");

-- CreateIndex
CREATE INDEX "strategic_innovation_areas_is_active_idx" ON "strategic_innovation_areas"("is_active");

-- CreateIndex
CREATE INDEX "strategic_innovation_areas_created_by_id_idx" ON "strategic_innovation_areas"("created_by_id");

-- CreateIndex
CREATE INDEX "trends_type_idx" ON "trends"("type");

-- CreateIndex
CREATE INDEX "trends_parent_id_idx" ON "trends"("parent_id");

-- CreateIndex
CREATE INDEX "trends_created_by_id_idx" ON "trends"("created_by_id");

-- CreateIndex
CREATE INDEX "trends_is_archived_idx" ON "trends"("is_archived");

-- CreateIndex
CREATE UNIQUE INDEX "trend_sia_links_trend_id_sia_id_key" ON "trend_sia_links"("trend_id", "sia_id");

-- CreateIndex
CREATE INDEX "insights_type_idx" ON "insights"("type");

-- CreateIndex
CREATE INDEX "insights_scope_idx" ON "insights"("scope");

-- CreateIndex
CREATE INDEX "insights_created_by_id_idx" ON "insights"("created_by_id");

-- CreateIndex
CREATE INDEX "insights_is_archived_idx" ON "insights"("is_archived");

-- CreateIndex
CREATE UNIQUE INDEX "trend_insight_links_trend_id_insight_id_key" ON "trend_insight_links"("trend_id", "insight_id");

-- CreateIndex
CREATE INDEX "technologies_maturity_level_idx" ON "technologies"("maturity_level");

-- CreateIndex
CREATE INDEX "technologies_created_by_id_idx" ON "technologies"("created_by_id");

-- CreateIndex
CREATE INDEX "technologies_is_archived_idx" ON "technologies"("is_archived");

-- CreateIndex
CREATE UNIQUE INDEX "tech_sia_links_tech_id_sia_id_key" ON "tech_sia_links"("tech_id", "sia_id");

-- CreateIndex
CREATE INDEX "innovation_portfolios_created_by_id_idx" ON "innovation_portfolios"("created_by_id");

-- CreateIndex
CREATE INDEX "portfolio_items_portfolio_id_idx" ON "portfolio_items"("portfolio_id");

-- CreateIndex
CREATE INDEX "portfolio_items_entity_type_entity_id_idx" ON "portfolio_items"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_items_portfolio_id_entity_type_entity_id_key" ON "portfolio_items"("portfolio_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "scim_tokens_token_hash_idx" ON "scim_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "scim_tokens_created_by_id_idx" ON "scim_tokens"("created_by_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_invitations" ADD CONSTRAINT "external_invitations_inviter_user_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_org_units" ADD CONSTRAINT "user_org_units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_org_units" ADD CONSTRAINT "user_org_units_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group_memberships" ADD CONSTRAINT "user_group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group_memberships" ADD CONSTRAINT "user_group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "innovation_space_memberships" ADD CONSTRAINT "innovation_space_memberships_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "innovation_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "innovation_space_memberships" ADD CONSTRAINT "innovation_space_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_sia_id_fkey" FOREIGN KEY ("sia_id") REFERENCES "strategic_innovation_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_sia_links" ADD CONSTRAINT "campaign_sia_links_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_sia_links" ADD CONSTRAINT "campaign_sia_links_sia_id_fkey" FOREIGN KEY ("sia_id") REFERENCES "strategic_innovation_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_members" ADD CONSTRAINT "campaign_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_kpi_snapshots" ADD CONSTRAINT "campaign_kpi_snapshots_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_split_from_id_fkey" FOREIGN KEY ("split_from_id") REFERENCES "ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_co_authors" ADD CONSTRAINT "idea_co_authors_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_co_authors" ADD CONSTRAINT "idea_co_authors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_merge_history" ADD CONSTRAINT "idea_merge_history_target_idea_id_fkey" FOREIGN KEY ("target_idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_merge_history" ADD CONSTRAINT "idea_merge_history_source_idea_id_fkey" FOREIGN KEY ("source_idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_likes" ADD CONSTRAINT "idea_likes_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_likes" ADD CONSTRAINT "idea_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_follows" ADD CONSTRAINT "idea_follows_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_follows" ADD CONSTRAINT "idea_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_managers" ADD CONSTRAINT "organization_managers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_managers" ADD CONSTRAINT "organization_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "use_cases" ADD CONSTRAINT "use_cases_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "use_cases" ADD CONSTRAINT "use_cases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "use_case_team_members" ADD CONSTRAINT "use_case_team_members_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "use_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "use_case_team_members" ADD CONSTRAINT "use_case_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "use_case_organizations" ADD CONSTRAINT "use_case_organizations_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "use_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "use_case_organizations" ADD CONSTRAINT "use_case_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "use_case_tasks" ADD CONSTRAINT "use_case_tasks_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "use_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "use_case_tasks" ADD CONSTRAINT "use_case_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_boards" ADD CONSTRAINT "scouting_boards_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_board_columns" ADD CONSTRAINT "scouting_board_columns_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "scouting_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_board_cards" ADD CONSTRAINT "scouting_board_cards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "scouting_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_board_cards" ADD CONSTRAINT "scouting_board_cards_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "scouting_board_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_board_cards" ADD CONSTRAINT "scouting_board_cards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_board_shares" ADD CONSTRAINT "scouting_board_shares_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "scouting_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_board_shares" ADD CONSTRAINT "scouting_board_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_missions" ADD CONSTRAINT "scouting_missions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_missions" ADD CONSTRAINT "scouting_missions_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "scouting_boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_mission_scouts" ADD CONSTRAINT "scouting_mission_scouts_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "scouting_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scouting_mission_scouts" ADD CONSTRAINT "scouting_mission_scouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_attribute_mappings" ADD CONSTRAINT "sso_attribute_mappings_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "sso_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_group_mappings" ADD CONSTRAINT "sso_group_mappings_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "sso_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buckets" ADD CONSTRAINT "buckets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_bucket_assignments" ADD CONSTRAINT "idea_bucket_assignments_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "buckets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_bucket_assignments" ADD CONSTRAINT "idea_bucket_assignments_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_sessions" ADD CONSTRAINT "evaluation_sessions_shortlist_locked_by_id_fkey" FOREIGN KEY ("shortlist_locked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_sessions" ADD CONSTRAINT "evaluation_sessions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_session_evaluators" ADD CONSTRAINT "evaluation_session_evaluators_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_session_ideas" ADD CONSTRAINT "evaluation_session_ideas_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_session_ideas" ADD CONSTRAINT "evaluation_session_ideas_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_responses" ADD CONSTRAINT "evaluation_responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_responses" ADD CONSTRAINT "evaluation_responses_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "evaluation_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_shortlist_items" ADD CONSTRAINT "evaluation_shortlist_items_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_shortlist_items" ADD CONSTRAINT "evaluation_shortlist_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_shortlist_items" ADD CONSTRAINT "evaluation_shortlist_items_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairwise_comparisons" ADD CONSTRAINT "pairwise_comparisons_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairwise_comparisons" ADD CONSTRAINT "pairwise_comparisons_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "evaluation_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairwise_comparisons" ADD CONSTRAINT "pairwise_comparisons_idea_a_id_fkey" FOREIGN KEY ("idea_a_id") REFERENCES "ideas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairwise_comparisons" ADD CONSTRAINT "pairwise_comparisons_idea_b_id_fkey" FOREIGN KEY ("idea_b_id") REFERENCES "ideas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_innovation_areas" ADD CONSTRAINT "strategic_innovation_areas_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trends" ADD CONSTRAINT "trends_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "trends"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trends" ADD CONSTRAINT "trends_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_sia_links" ADD CONSTRAINT "trend_sia_links_trend_id_fkey" FOREIGN KEY ("trend_id") REFERENCES "trends"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_sia_links" ADD CONSTRAINT "trend_sia_links_sia_id_fkey" FOREIGN KEY ("sia_id") REFERENCES "strategic_innovation_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_insight_links" ADD CONSTRAINT "trend_insight_links_trend_id_fkey" FOREIGN KEY ("trend_id") REFERENCES "trends"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_insight_links" ADD CONSTRAINT "trend_insight_links_insight_id_fkey" FOREIGN KEY ("insight_id") REFERENCES "insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technologies" ADD CONSTRAINT "technologies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tech_sia_links" ADD CONSTRAINT "tech_sia_links_tech_id_fkey" FOREIGN KEY ("tech_id") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tech_sia_links" ADD CONSTRAINT "tech_sia_links_sia_id_fkey" FOREIGN KEY ("sia_id") REFERENCES "strategic_innovation_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "innovation_portfolios" ADD CONSTRAINT "innovation_portfolios_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "innovation_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scim_tokens" ADD CONSTRAINT "scim_tokens_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

