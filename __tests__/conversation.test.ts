import {
  formatConversation,
  getConversationMessages,
  conversation,
  participants,
} from '../lib/conversation';

describe('Conversation Utils', () => {
  describe('participants', () => {
    it('should have 5 participants', () => {
      expect(participants).toHaveLength(5);
    });

    it('should have required fields for each participant', () => {
      participants.forEach(p => {
        expect(p).toHaveProperty('name');
        expect(p).toHaveProperty('role');
        expect(p).toHaveProperty('expertise');
        expect(typeof p.name).toBe('string');
        expect(typeof p.role).toBe('string');
        expect(typeof p.expertise).toBe('string');
      });
    });

    it('should include expected team roles', () => {
      const roles = participants.map(p => p.role);
      expect(roles).toContain('Tech Lead');
      expect(roles).toContain('Backend Developer');
      expect(roles).toContain('Frontend Developer');
      expect(roles).toContain('Product Manager');
      expect(roles).toContain('DevOps Engineer');
    });
  });

  describe('conversation', () => {
    it('should have messages', () => {
      expect(conversation.length).toBeGreaterThan(0);
    });

    it('should have valid message structure', () => {
      conversation.forEach(msg => {
        expect(msg).toHaveProperty('participant');
        expect(msg).toHaveProperty('message');
        expect(typeof msg.participant).toBe('string');
        expect(typeof msg.message).toBe('string');
      });
    });

    it('should only reference known participants', () => {
      const participantNames = participants.map(p => p.name);
      conversation.forEach(msg => {
        expect(participantNames).toContain(msg.participant);
      });
    });
  });

  describe('formatConversation', () => {
    it('should return a non-empty string', () => {
      const result = formatConversation();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format messages as "participant: message"', () => {
      const result = formatConversation();
      const lines = result.split('\n\n');

      lines.forEach(line => {
        expect(line).toMatch(/^[A-Za-z]+: .+/);
      });
    });

    it('should include all conversation messages', () => {
      const result = formatConversation();
      const lines = result.split('\n\n');

      expect(lines).toHaveLength(conversation.length);
    });

    it('should preserve message content', () => {
      const result = formatConversation();

      conversation.forEach(msg => {
        expect(result).toContain(msg.participant);
        expect(result).toContain(msg.message);
      });
    });
  });

  describe('getConversationMessages', () => {
    it('should return an array with one user message', () => {
      const messages = getConversationMessages();

      expect(Array.isArray(messages)).toBe(true);
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
    });

    it('should include formatted conversation in content', () => {
      const messages = getConversationMessages();
      const formattedConversation = formatConversation();

      expect(messages[0].content).toContain(formattedConversation);
    });

    it('should include context header', () => {
      const messages = getConversationMessages();

      expect(messages[0].content).toContain('conversation between team members');
    });
  });
});
