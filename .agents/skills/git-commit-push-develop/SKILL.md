---
name: git-commit-push-develop
description: >-
  Stages intentional changes, writes a commit message (with a type-matched
  leading emoji on the subject line) that reflects the actual diff and
  completed work, and pushes to the remote branch develop. Use when the user
  asks to commit and push to develop, guardar en develop, subir cambios a
  develop, or run git add / commit / push targeting develop.
---

# Git: add, commit (trabajo real) y push a develop

## Objetivo

Dejar el trabajo actual **commiteado con un mensaje fiel al diff** y **publicado en `origin/develop`**, sin incluir secretos ni ruido accidental.

## Antes de tocar el índice

1. `git status` y `git diff` (y `git diff --staged` si ya hay algo staged).
2. **No** incluir en el commit: `.env`, `.env.local`, `.env.*.local`, claves, PEM, credenciales, dumps grandes no pedidos. Si aparecen en `git status`, no los añadas; avisa si el usuario los necesita en otro flujo (por ejemplo variables en el hosting).

## Staging (`git add`)

- Preferir `git add <rutas concretas>` alineadas con el cambio real.
- Si el usuario quiere todo lo rastreable modificado: `git add -u` (solo tracked).
- Evitar `git add .` ciego si hay untracked que no forman parte del trabajo (artefactos, `.agents` internos, etc.), salvo que el usuario lo pida explícitamente.

Si no hay cambios que commitear, detenerse y comunicarlo.

## Mensaje de commit

- Redactar en función del **diff real** (qué archivos, qué comportamiento cambió).
- Estilo recomendado: [Conventional Commits](https://www.conventionalcommits.org/) en inglés o español, línea corta + cuerpo opcional:

  ```
  emoji tipo(ámbito): resumen imperativo

  - detalle opcional alineado con el diff
  ```

- Tipos habituales: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
- No mensajes genéricos tipo "update" o "cambios" sin sustancia.

### Emoji en la primera línea (dinámico según el tipo)

Colocar **un solo emoji al inicio** del asunto (antes de `tipo(ámbito):`), elegido por la **naturaleza principal del diff**, no al azar. Si el commit mezcla varios tipos, usar el emoji del cambio que más peso tiene.

| Tipo / caso principal | Emoji | Ejemplo de subject |
|----------------------|-------|---------------------|
| `feat`, nueva funcionalidad o UX notable | 🚀 | `🚀 feat(billing): exportar facturas en CSV` |
| `fix`, corrección de bug o regresión | 🐛 | `🐛 fix(auth): restaurar sesión tras refresh` |
| `test`, tests nuevos o ajuste de cobertura | ✅ | `✅ test(api): casos límite de paginación` |
| `docs`, README, comentarios de documentación | ✏️ | `✏️ docs: aclarar variables de entorno` |
| `revert`, rollback, o cambio que deshace algo dañino | ❌ | `❌ revert: deshacer migración que rompía build` |
| `perf`, optimización clara de rendimiento | ⚡ | `⚡ perf(dashboard): memoizar lista de cuentas` |
| `refactor`, mismo comportamiento, código más claro | ♻️ | `♻️ refactor(lib): extraer validación de fechas` |
| `style`, formato / lint sin lógica | 💄 | `💄 style: aplicar prettier en components` |
| `chore`, deps, tooling, CI sin feat/fix | 🔧 | `🔧 chore: subir eslint a 9.x` |

**Referencia rápida del set aprobado** (elegir **uno** por commit): 🚀 feat · 🐛 fix · ✅ test · ✏️ docs/copy · ❌ revert · ⚡ perf · ♻️ refactor · 💄 style · 🔧 chore.

Reglas:

- **No abusar**: un emoji en la primera línea; el cuerpo del commit puede usar listas con `-` sin emoji extra salvo que aporte claridad.
- Si el diff es puramente **copy o typos** en UI (no `docs` de repo), puede usarse **✏️** igualmente.
- Para **breaking change** explícito en el subject (convención `!`), se puede combinar **❌** o **🚀** según sea “rompe API” vs “gran entrega”; por defecto **🚀** si es una feature mayor con `!`.

## Rama `develop` y push

1. `git fetch origin` (si hay red y remoto `origin`).
2. **Si la rama actual es `develop`**: opcionalmente `git pull --rebase origin develop` antes del push si el equipo lo usa; si no, `git pull origin develop` y resolver conflictos si aparecen.
3. **Si la rama actual no es `develop`**:
   - Hacer el commit en la rama actual (con los cambios ya staged).
   - `git checkout develop` (crear tracking si hace falta: `git checkout -b develop origin/develop`).
   - Integrar el trabajo: `git merge <rama-anterior>` (o el flujo que use el repo: rebase, PR, etc.). Si el usuario solo pidió “subir a develop” sin integrar otra rama, **preguntar** o seguir el patrón ya usado en el repo.
4. Push: `git push origin develop`. Si es la primera vez que se publica la rama: `git push -u origin develop`.

## Prohibido salvo orden explícita del usuario

- `git push --force` / `--force-with-lease` hacia `develop`.
- Commits vacíos o masivos que mezclen tareas no relacionadas con lo pedido.

## Cierre

Confirmar: rama, hash corto del commit, **primera línea del mensaje** (con emoji), y que el push a `origin/develop` terminó correctamente (o el error concreto de remoto/CI si falla).
