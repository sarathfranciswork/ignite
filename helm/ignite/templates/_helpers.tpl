{{/*
Expand the name of the chart.
*/}}
{{- define "ignite.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "ignite.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "ignite.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "ignite.labels" -}}
helm.sh/chart: {{ include "ignite.chart" . }}
{{ include "ignite.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "ignite.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ignite.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
App selector labels
*/}}
{{- define "ignite.app.selectorLabels" -}}
{{ include "ignite.selectorLabels" . }}
app.kubernetes.io/component: app
{{- end }}

{{/*
Worker selector labels
*/}}
{{- define "ignite.worker.selectorLabels" -}}
{{ include "ignite.selectorLabels" . }}
app.kubernetes.io/component: worker
{{- end }}

{{/*
Image reference
*/}}
{{- define "ignite.image" -}}
{{- $tag := default .Chart.AppVersion .Values.image.tag -}}
{{- printf "%s:%s" .Values.image.repository $tag }}
{{- end }}

{{/*
Secret name — use existing or generated
*/}}
{{- define "ignite.secretName" -}}
{{- if .Values.existingSecret }}
{{- .Values.existingSecret }}
{{- else }}
{{- include "ignite.fullname" . }}
{{- end }}
{{- end }}

{{/*
ConfigMap name
*/}}
{{- define "ignite.configMapName" -}}
{{- printf "%s-config" (include "ignite.fullname" .) }}
{{- end }}

{{/*
PostgreSQL internal URL — used when built-in PostgreSQL is enabled
*/}}
{{- define "ignite.postgresql.url" -}}
{{- $host := printf "%s-postgresql" (include "ignite.fullname" .) -}}
{{- printf "postgresql://%s:%s@%s:5432/%s?schema=public" .Values.postgresql.auth.username .Values.postgresql.auth.password $host .Values.postgresql.auth.database }}
{{- end }}

{{/*
Redis internal URL — used when built-in Redis is enabled
*/}}
{{- define "ignite.redis.url" -}}
{{- $host := printf "%s-redis" (include "ignite.fullname" .) -}}
{{- printf "redis://%s:6379" $host }}
{{- end }}
