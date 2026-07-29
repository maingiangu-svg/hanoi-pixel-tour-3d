import { STORY_CHAPTERS, getUnlockedChapters, getNextChapter } from './StoryChapters.js'

/**
 * StoryManager — tracks chapter progress and triggers story events.
 *
 * Integrates with the existing PhotoQuestSystem and DialogueSystem.
 * Stores progress in the save system.
 */
export class StoryManager {
  constructor({ questSystem, dialogueSystem, ui, clock, onChapterComplete }) {
    this.questSystem = questSystem
    this.dialogueSystem = dialogueSystem
    this.ui = ui
    this.clock = clock
    this.onChapterComplete = onChapterComplete ?? (() => {})

    // State
    this.currentChapterId = null
    this.completedChapters = []
    this.completedQuests = []
    this.storyStarted = false

    // Register story quests with the quest system
    this.#registerStoryQuests()
  }

  /**
   * Serialize for save system.
   */
  serialize() {
    return {
      currentChapterId: this.currentChapterId,
      completedChapters: [...this.completedChapters],
      completedQuests: [...this.completedQuests],
      storyStarted: this.storyStarted,
    }
  }

  /**
   * Restore from save data.
   */
  restore(data) {
    if (!data) return
    this.currentChapterId = data.currentChapterId ?? null
    this.completedChapters = data.completedChapters ?? []
    this.completedQuests = data.completedQuests ?? []
    this.storyStarted = data.storyStarted ?? false
  }

  /**
   * Start the story — trigger Chapter 1 dialogue.
   */
  startStory() {
    if (this.storyStarted) return
    this.storyStarted = true
    this.currentChapterId = STORY_CHAPTERS[0].id
    this.#triggerChapterDialogue(this.currentChapterId)
    this.ui?.showNotice?.(`📖 Chương 1: ${STORY_CHAPTERS[0].title}`, 3000)
  }

  /**
   * Check if a quest completion unlocks a story chapter.
   */
  onQuestCompleted(questId) {
    if (this.completedQuests.includes(questId)) return
    this.completedQuests.push(questId)

    // Check if this quest completes a chapter
    for (const chapter of STORY_CHAPTERS) {
      if (this.completedChapters.includes(chapter.id)) continue

      const chapterQuestIds = chapter.quests.map((q) => q.id)
      const allCompleted = chapterQuestIds.every((id) =>
        this.completedQuests.includes(id)
      )

      if (allCompleted) {
        this.#completeChapter(chapter.id)
      }
    }
  }

  /**
   * Get the current chapter info for UI display.
   */
  getCurrentChapterInfo() {
    if (!this.currentChapterId) return null
    const chapter = STORY_CHAPTERS.find((ch) => ch.id === this.currentChapterId)
    if (!chapter) return null

    const chapterQuestIds = chapter.quests.map((q) => q.id)
    const completedInChapter = chapterQuestIds.filter((id) =>
      this.completedQuests.includes(id)
    )

    return {
      ...chapter,
      progress: completedInChapter.length,
      total: chapterQuestIds.length,
      isComplete: completedInChapter.length === chapterQuestIds.length,
    }
  }

  /**
   * Get all chapters with their unlock/completion status.
   */
  getAllChaptersStatus() {
    return STORY_CHAPTERS.map((chapter) => {
      const isUnlocked = !chapter.unlockCondition ||
        this.completedChapters.includes(chapter.unlockCondition)
      const isCompleted = this.completedChapters.includes(chapter.id)
      const chapterQuestIds = chapter.quests.map((q) => q.id)
      const completedInChapter = chapterQuestIds.filter((id) =>
        this.completedQuests.includes(id)
      )

      return {
        id: chapter.id,
        title: chapter.title,
        subtitle: chapter.subtitle,
        isUnlocked,
        isCompleted,
        progress: completedInChapter.length,
        total: chapterQuestIds.length,
      }
    })
  }

  // ─── Private ───────────────────────────────────

  #registerStoryQuests() {
    for (const chapter of STORY_CHAPTERS) {
      for (const quest of chapter.quests) {
        // Story quests are registered but not active until their chapter is unlocked
        this.questSystem?.registerStoryQuest?.(quest, chapter.id)
      }
    }
  }

  #completeChapter(chapterId) {
    if (this.completedChapters.includes(chapterId)) return
    this.completedChapters.push(chapterId)

    const chapter = STORY_CHAPTERS.find((ch) => ch.id === chapterId)
    if (!chapter) return

    // Trigger completion dialogue
    this.#triggerChapterDialogue(chapterId)

    // Unlock next chapter
    const nextChapter = getNextChapter(chapterId)
    if (nextChapter) {
      this.currentChapterId = nextChapter.id
      this.ui?.showNotice?.(`📖 Mở khóa: ${nextChapter.title} — ${nextChapter.subtitle}`, 3000)
    } else {
      // Story complete!
      this.currentChapterId = null
      this.ui?.showNotice?.('🎉 Hoàn thành câu chuyện của Mơ!', 5000)
    }

    this.onChapterComplete(chapterId, nextChapter?.id)
  }

  #triggerChapterDialogue(chapterId) {
    const chapter = STORY_CHAPTERS.find((ch) => ch.id === chapterId)
    if (!chapter?.dialogue?.length) return

    // Store dialogue for the dialogue system to pick up
    this.pendingDialogue = chapter.dialogue
  }

  /**
   * Called each frame to check if we should trigger pending dialogue.
   */
  update() {
    if (this.pendingDialogue && this.dialogueSystem && !this.dialogueSystem.isActive()) {
      // Could trigger dialogue here if Mo is nearby
      // For now, just clear it — dialogue is triggered via interaction
    }
  }
}
