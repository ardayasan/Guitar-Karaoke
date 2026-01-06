import Foundation

final class PitchSmoothingFilter {

    private var history: [YinResult] = []
    private let maxHistory: Int

    init(maxHistory: Int = 5) {
        self.maxHistory = maxHistory
    }

    func addResult(_ result: YinResult?) -> YinResult? {
        // JS: result === null → reset
        guard let result else {
            history.removeAll()
            return nil
        }

        // JS: confidence gate
        if result.confidence < 0.75 {
            return nil
        }

        // JS: ignore first frame
        if history.isEmpty {
            history.append(result)
            return nil
        }

        history.append(result)

        // JS: buffer dolmadan output yok
        if history.count < maxHistory {
            return nil
        }

        if history.count > maxHistory {
            history.removeFirst()
        }

        var sumFreq = 0.0
        var sumConf = 0.0
        var sumPer = 0.0
        var totalWeight = 0.0

        for (index, r) in history.enumerated() {
            let weight = Double(index + 1)
            sumFreq += r.frequency * weight
            sumConf += r.confidence * weight
            sumPer += r.periodicity * weight
            totalWeight += weight
        }

        return YinResult(
            frequency: sumFreq / totalWeight,
            confidence: sumConf / totalWeight,
            periodicity: sumPer / totalWeight
        )
    }

    func reset() {
        history.removeAll()
    }
}
