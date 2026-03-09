// Health Component - tracks health and handles damage

const { Component } = require('./Component.js');

class Health extends Component {
  constructor(maxHealth = 1) {
    super('Health');
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
    this.invulnerable = false;
    this.onDamaged = null; // Callback(amount, currentHealth)
    this.onHealed = null;  // Callback(amount, currentHealth)
    this.onDied = null;    // Callback()
  }

  setMaxHealth(maxHealth) {
    this.maxHealth = maxHealth;
    this.currentHealth = Math.min(this.currentHealth, maxHealth);
    return this;
  }

  setHealth(health) {
    this.currentHealth = Math.min(health, this.maxHealth);
    return this;
  }

  fullHeal() {
    this.currentHealth = this.maxHealth;
    return this;
  }

  takeDamage(amount) {
    if (this.invulnerable || this.currentHealth <= 0) return false;

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    
    if (this.onDamaged) {
      this.onDamaged(amount, this.currentHealth);
    }

    if (this.currentHealth <= 0 && this.onDied) {
      this.onDied();
    }

    return this.currentHealth <= 0;
  }

  heal(amount) {
    const prevHealth = this.currentHealth;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    const healed = this.currentHealth - prevHealth;

    if (healed > 0 && this.onHealed) {
      this.onHealed(healed, this.currentHealth);
    }

    return this;
  }

  isDead() {
    return this.currentHealth <= 0;
  }

  getHealthPercent() {
    return this.currentHealth / this.maxHealth;
  }
}

module.exports = { Health };
