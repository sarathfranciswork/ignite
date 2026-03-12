import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/server/lib/logger";
import {
  validateScimToken,
  createScimUser,
  getScimUser,
  listScimUsers,
  updateScimUser,
  patchScimUser,
  deleteScimUser,
  createScimGroup,
  getScimGroup,
  listScimGroups,
  updateScimGroup,
  patchScimGroup,
  deleteScimGroup,
  getServiceProviderConfig,
  getSchemas,
  getResourceTypes,
  ScimServiceError,
} from "@/server/services/scim.service";
import {
  scimUserSchema,
  scimPatchRequestSchema,
  scimGroupSchema,
  scimListQuerySchema,
} from "@/server/services/scim.schemas";

const SCIM_CONTENT_TYPE = "application/scim+json";

function scimError(status: number, detail: string, scimType?: string) {
  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      status: String(status),
      detail,
      scimType,
    },
    { status, headers: { "Content-Type": SCIM_CONTENT_TYPE } },
  );
}

function scimResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": SCIM_CONTENT_TYPE },
  });
}

async function authenticate(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7);
  return validateScimToken(token);
}

function parsePath(params: { path: string[] }): { resource: string; id?: string } {
  const [resource, id] = params.path;
  return { resource, id };
}

// ── Discovery endpoints (no auth required) ──────────────────────

async function handleDiscovery(resource: string) {
  switch (resource) {
    case "ServiceProviderConfig":
      return scimResponse(getServiceProviderConfig());
    case "Schemas":
      return scimResponse(getSchemas());
    case "ResourceTypes":
      return scimResponse(getResourceTypes());
    default:
      return null;
  }
}

// ── User handlers ───────────────────────────────────────────────

async function handleGetUsers(request: NextRequest) {
  const url = new URL(request.url);
  const query = scimListQuerySchema.parse({
    filter: url.searchParams.get("filter") ?? undefined,
    startIndex: url.searchParams.get("startIndex") ?? undefined,
    count: url.searchParams.get("count") ?? undefined,
  });
  return scimResponse(await listScimUsers(query));
}

async function handleGetUser(id: string) {
  return scimResponse(await getScimUser(id));
}

async function handleCreateUser(request: NextRequest) {
  const body = await request.json();
  const payload = scimUserSchema.parse(body);
  const user = await createScimUser(payload);
  return scimResponse(user, 201);
}

async function handlePutUser(id: string, request: NextRequest) {
  const body = await request.json();
  const payload = scimUserSchema.parse(body);
  return scimResponse(await updateScimUser(id, payload));
}

async function handlePatchUser(id: string, request: NextRequest) {
  const body = await request.json();
  const patchReq = scimPatchRequestSchema.parse(body);
  return scimResponse(await patchScimUser(id, patchReq));
}

async function handleDeleteUser(id: string) {
  await deleteScimUser(id);
  return new NextResponse(null, { status: 204 });
}

// ── Group handlers ──────────────────────────────────────────────

async function handleGetGroups(request: NextRequest) {
  const url = new URL(request.url);
  const query = scimListQuerySchema.parse({
    filter: url.searchParams.get("filter") ?? undefined,
    startIndex: url.searchParams.get("startIndex") ?? undefined,
    count: url.searchParams.get("count") ?? undefined,
  });
  return scimResponse(await listScimGroups(query));
}

async function handleGetGroup(id: string) {
  return scimResponse(await getScimGroup(id));
}

async function handleCreateGroup(request: NextRequest) {
  const body = await request.json();
  const payload = scimGroupSchema.parse(body);
  const group = await createScimGroup(payload);
  return scimResponse(group, 201);
}

async function handlePutGroup(id: string, request: NextRequest) {
  const body = await request.json();
  const payload = scimGroupSchema.parse(body);
  return scimResponse(await updateScimGroup(id, payload));
}

async function handlePatchGroup(id: string, request: NextRequest) {
  const body = await request.json();
  const patchReq = scimPatchRequestSchema.parse(body);
  return scimResponse(await patchScimGroup(id, patchReq));
}

async function handleDeleteGroup(id: string) {
  await deleteScimGroup(id);
  return new NextResponse(null, { status: 204 });
}

// ── Route Handler ───────────────────────────────────────────────

async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
  method: string,
) {
  const resolvedParams = await params;
  const { resource, id } = parsePath(resolvedParams);

  try {
    const discoveryResponse = await handleDiscovery(resource);
    if (discoveryResponse) return discoveryResponse;

    const authenticated = await authenticate(request);
    if (!authenticated) {
      return scimError(401, "Invalid or missing bearer token", "invalidToken");
    }

    if (resource === "Users") {
      switch (method) {
        case "GET":
          return id ? await handleGetUser(id) : await handleGetUsers(request);
        case "POST":
          return await handleCreateUser(request);
        case "PUT":
          if (!id) return scimError(400, "User ID is required for PUT");
          return await handlePutUser(id, request);
        case "PATCH":
          if (!id) return scimError(400, "User ID is required for PATCH");
          return await handlePatchUser(id, request);
        case "DELETE":
          if (!id) return scimError(400, "User ID is required for DELETE");
          return await handleDeleteUser(id);
        default:
          return scimError(405, `Method ${method} not allowed`);
      }
    }

    if (resource === "Groups") {
      switch (method) {
        case "GET":
          return id ? await handleGetGroup(id) : await handleGetGroups(request);
        case "POST":
          return await handleCreateGroup(request);
        case "PUT":
          if (!id) return scimError(400, "Group ID is required for PUT");
          return await handlePutGroup(id, request);
        case "PATCH":
          if (!id) return scimError(400, "Group ID is required for PATCH");
          return await handlePatchGroup(id, request);
        case "DELETE":
          if (!id) return scimError(400, "Group ID is required for DELETE");
          return await handleDeleteGroup(id);
        default:
          return scimError(405, `Method ${method} not allowed`);
      }
    }

    return scimError(404, `Resource ${resource} not found`);
  } catch (error) {
    if (error instanceof ScimServiceError) {
      return scimError(error.httpStatus, error.message, error.code);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return scimError(400, `Invalid request body: ${error.message}`, "invalidValue");
    }

    logger.error({ error, resource, id, method }, "SCIM request failed");
    return scimError(500, "Internal server error");
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, context, "GET");
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, context, "POST");
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, context, "PUT");
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return handleRequest(request, context, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return handleRequest(request, context, "DELETE");
}
