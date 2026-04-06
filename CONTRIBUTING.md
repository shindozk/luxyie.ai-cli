# Contributing to Luxyie AI CLI

Thank you for considering contributing to Luxyie! We welcome all types of contributions — whether it's fixing a bug, improving documentation, adding a new feature, or just giving feedback.

## 🌱 How to Contribute

### 1. Open an Issue
Before starting work, open an issue to discuss your idea. This helps avoid duplicate work and ensures alignment with the project's direction.

### 2. Fork the Repository

```bash
git clone https://github.com/shindozk/luxyie.ai-cli.git
cd luxyie.ai-cli
npm install
```

### 3. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 4. Make Changes

- Follow the existing code style (TypeScript, Prettier, ESLint).
- Write tests for new features (Jest).
- Update documentation and README if needed.

### 5. Test Your Changes

```bash
npm run build
npm run test
npm run lint
```

### 6. Commit and Push

Use clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add image analysis command"
git push origin feature/your-feature-name
```

### 7. Open a Pull Request

Go to GitHub and open a PR against `main`. Include:

- A clear title
- A description of what changed
- Screenshots or GIFs if UI-related
- Links to related issues

## 🧪 Testing

Run all tests:

```bash
npm run test
```

Run a specific test:

```bash
npm run test -- src/services/openai.service.test.ts
```

## 📜 Code Style

- Use **TypeScript** with strict mode.
- Format with **Prettier** (`npm run format`).
- Lint with **ESLint** (`npm run lint`).
- Write **JSDoc** comments for public functions.

## 🚀 Publishing

Only maintainers can publish new versions. Use:

```bash
npm version patch|minor|major
npm publish
```

## 💬 Communication

Join our Discord or open an issue for questions.

---

> ❤️ Thank you for helping make Luxyie better for everyone!