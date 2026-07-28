export class MarketingOsStateAdapter {
  async consumeRateLimit(_tenant, _request) {
    throw new Error("consumeRateLimit is not implemented.");
  }

  async readContextSnapshot(_tenant) {
    throw new Error("readContextSnapshot is not implemented.");
  }

  async publishContextSnapshot(_tenant, _request, _options) {
    throw new Error("publishContextSnapshot is not implemented.");
  }

  async storeSource(_tenant, _request) {
    throw new Error("storeSource is not implemented.");
  }

  async getSource(_tenant, _sourceId, _revision) {
    throw new Error("getSource is not implemented.");
  }

  async reviseSource(_tenant, _request) {
    throw new Error("reviseSource is not implemented.");
  }

  async deleteSource(_tenant, _request) {
    throw new Error("deleteSource is not implemented.");
  }

  async storeArtifact(_tenant, _request) {
    throw new Error("storeArtifact is not implemented.");
  }

  async getArtifact(_tenant, _artifactId, _revision) {
    throw new Error("getArtifact is not implemented.");
  }

  async reviseArtifact(_tenant, _request) {
    throw new Error("reviseArtifact is not implemented.");
  }

  async setArtifactStatus(_tenant, _request) {
    throw new Error("setArtifactStatus is not implemented.");
  }

  async approveArtifact(_tenant, _request) {
    throw new Error("approveArtifact is not implemented.");
  }

  async readWorkstream(_tenant, _specialist) {
    throw new Error("readWorkstream is not implemented.");
  }

  async updateWorkstream(_tenant, _request) {
    throw new Error("updateWorkstream is not implemented.");
  }

  async createHandoff(_tenant, _request) {
    throw new Error("createHandoff is not implemented.");
  }

  async updateHandoff(_tenant, _request) {
    throw new Error("updateHandoff is not implemented.");
  }

  async getAuditTrail(_tenant) {
    throw new Error("getAuditTrail is not implemented.");
  }

  async exportWorkspace(_tenant) {
    throw new Error("exportWorkspace is not implemented.");
  }

  async deleteWorkspace(_tenant, _request) {
    throw new Error("deleteWorkspace is not implemented.");
  }
}
