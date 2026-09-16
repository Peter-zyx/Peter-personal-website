import XCTest
import SwiftUI
@testable import CPApp

// Portfolio-only capture harness. FakeBackend has no network implementation.
@MainActor final class PortfolioCaptureTests: XCTestCase {
  func testCaptureEnglishScreens() async throws {
    UserDefaults.standard.set(AppLanguage.english.rawValue, forKey: AppLanguage.preferenceKey)
    let today = Day.string(Date())
    let stamp = today + "T08:00:00Z"
    var snapshot = Fixtures.snapshot
    snapshot.profile.display_name = "Alex"
    snapshot.profiles = [Profile(id: Fixtures.userID, display_name: "Alex"), Profile(id: Fixtures.partnerID, display_name: "Sam")]
    snapshot.couple = Couple(id: Fixtures.coupleID, since: "2026-01-01")
    snapshot.tasks = [
      task("Pick up dinner", category: "Everyday", day: today, assigned: Fixtures.userID),
      task("Plan our weekend", category: "Together", day: today, assigned: Fixtures.partnerID),
      task("Water the plants", category: "Home", day: today, assigned: Fixtures.userID),
      task("Cook something new", category: "Together", day: today, assigned: Fixtures.partnerID, done: true),
      task("Book the train", category: "Travel", day: today, assigned: Fixtures.userID, done: true)
    ]
    snapshot.expenses = [
      expense("Dinner for two", cents: 18600, category: "餐饮", day: today, payer: Fixtures.userID),
      expense("Weekend groceries", cents: 12850, category: "家居", day: today, payer: Fixtures.partnerID),
      expense("Two cinema tickets", cents: 9600, category: "约会", day: today, payer: Fixtures.userID)
    ]
    snapshot.wishes = [
      WishEntry(id: UUID(), couple_id: Fixtures.coupleID, created_by: Fixtures.userID, kind: .topic, title: "A weekend by the sea", body: "Find a quiet place, take the train and leave time for a long walk.", category: "Travel", stage: .direction, voided: false, created_at: stamp, updated_at: stamp),
      WishEntry(id: UUID(), couple_id: Fixtures.coupleID, created_by: Fixtures.partnerID, kind: .topic, title: "Our Sunday ritual", body: "Coffee, a farmers' market and a new recipe to cook together.", category: "Everyday", stage: .thinking, voided: false, created_at: stamp, updated_at: stamp),
      WishEntry(id: UUID(), couple_id: Fixtures.coupleID, created_by: Fixtures.partnerID, kind: .note, title: "A little reminder", body: "Home is us.", category: "", stage: .thinking, voided: false, created_at: stamp, updated_at: stamp)
    ]
    snapshot.wishes.append(WishEntry(id: UUID(), couple_id: Fixtures.coupleID, created_by: Fixtures.userID, kind: .note, title: "For later", body: "Tea, then a walk?", category: "", stage: .thinking, voided: false, created_at: today + "T07:00:00Z", updated_at: today + "T07:00:00Z"))
    let backend = FakeBackend(); backend.snapshot = snapshot
    let model = AppModel(backend: backend)
    let observer = Task { await model.observeSession() }
    defer { observer.cancel() }
    for _ in 0..<100 where backend.continuation == nil { await Task.yield() }
    backend.continuation?.yield(Fixtures.userID)
    for _ in 0..<100 where model.snapshot == nil { await Task.yield() }
    XCTAssertNotNil(model.snapshot)
    let navigation = WebNavigation()
    for (name, tab) in [("home", WebTab.home), ("tasks", .tasks), ("ledger", .ledger), ("us", .us)] {
      navigation.select(tab)
      try await capture(WorkspaceView(model: model, snapshot: snapshot).environment(navigation), name: name)
    }
    navigation.select(.tasks)
    try await capture(NavigationStack { TaskDetailView(model: model, taskID: snapshot.tasks[0].id) }.environment(navigation), name: "task-detail")
    try await capture(NavigationStack { WishView(model: model, snapshot: snapshot) }.environment(navigation), name: "wishes")
    try await capture(NavigationStack { WishView(model: model, snapshot: snapshot, initialKind: .note) }.environment(navigation), name: "notes")
    try await capture(NavigationStack { WeekDetailView(model: model, start: "2026-09-14") }.environment(navigation).environment(AIJournalSettings()), name: "week")
    try await capture(NavigationStack { LanguageSettingsView() }.environment(navigation), name: "language")
    XCTAssertEqual(backend.savedCount, 0)
  }

  private func task(_ title: String, category: String, day: String, assigned: UUID, done: Bool = false) -> SharedTask {
    SharedTask(id: UUID(), couple_id: Fixtures.coupleID, created_by: Fixtures.userID, assigned_to: assigned, title: title, body: "A little thing to do together.", start_date: day, due_date: day, status: done ? .completed : .pending, category: category, priority: "normal", daily_reminder: false, lock_screen_list: false, updated_at: day + "T08:00:00Z", created_at: day + "T08:00:00Z", completed_at: done ? day + "T09:00:00Z" : nil)
  }
  private func expense(_ title: String, cents: Int64, category: String, day: String, payer: UUID) -> Expense {
    Expense(id: UUID(), couple_id: Fixtures.coupleID, created_by: payer, paid_by: payer, title: title, body: "", spent_on: day, category: category, amount_cents: cents, split_mode: .equal, share_one_cents: (cents + 1) / 2, settled: false, voided: false, updated_at: day + "T08:00:00Z")
  }
  private func capture<Content: View>(_ view: Content, name: String) async throws {
    let content = view.environment(\.locale, AppLanguage.english.locale).preferredColorScheme(.light).tint(Theme.rose)
    let host = UIHostingController(rootView: content)
    let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let window = UIWindow(windowScene: scene)
    window.frame = CGRect(x: 0, y: 0, width: 402, height: 874)
    window.rootViewController = host
    window.makeKeyAndVisible()
    defer { window.isHidden = true }
    try await Task.sleep(for: .milliseconds(800))
    host.view.layoutIfNeeded()
    let renderer = UIGraphicsImageRenderer(bounds: host.view.bounds)
    let captured = renderer.image { _ in host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true) }
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("portfolio-\(name)-en.png")
    try XCTUnwrap(captured.pngData()).write(to: url)
    print("PORTFOLIO_SCREENSHOT: \(url.path)")
  }
}
