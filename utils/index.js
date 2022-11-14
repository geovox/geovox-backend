const levellingTier = (totalCollected) => {
  if (totalCollected < 5) {
    return {
      level: 'Lurker',
      levelStart: 0,
      levelEnd: 5,
      nextLevelRemaining: 5 - totalCollected,
      nextLevel: 'Craftsman',
    }
  } else if (totalCollected < 10) {
    return {
      level: 'Craftsman',
      levelStart: 5,
      levelEnd: 10,
      nextLevelRemaining: 10 - totalCollected,
      nextLevel: 'Adventurer',
    }
  } else if (totalCollected < 20) {
    return {
      level: 'Adventurer',
      levelStart: 10,
      levelEnd: 20,
      nextLevelRemaining: 20 - totalCollected,
      nextLevel: 'Demigod',
    }
  } else {
    return {
      level: 'Demigod',
      levelStart: 20,
      levelEnd: 0,
      nextLevelRemaining: 0,
    }
  }
}

module.exports = { levellingTier }
