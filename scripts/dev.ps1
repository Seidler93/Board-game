$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

$commands = @(
  @{
    Name = "server"
    Directory = Join-Path $root "server"
    Script = { param($Directory) Set-Location $Directory; node server.js }
  },
  @{
    Name = "client"
    Directory = Join-Path $root "client"
    Script = { param($Directory) Set-Location $Directory; npm.cmd run dev }
  }
)

$jobs = foreach ($command in $commands) {
  Start-Job `
    -Name $command.Name `
    -ScriptBlock $command.Script `
    -ArgumentList $command.Directory
}

try {
  while ($true) {
    foreach ($job in $jobs) {
      Receive-Job -Job $job | ForEach-Object {
        "[$($job.Name)] $_"
      }

      if ($job.State -in @("Completed", "Failed", "Stopped")) {
        $reason = if ($job.ChildJobs[0].JobStateInfo.Reason) {
          $job.ChildJobs[0].JobStateInfo.Reason.Message
        } else {
          $job.State
        }

        throw "$($job.Name) stopped: $reason"
      }
    }

    Start-Sleep -Milliseconds 200
  }
} finally {
  foreach ($job in $jobs) {
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
  }
}
