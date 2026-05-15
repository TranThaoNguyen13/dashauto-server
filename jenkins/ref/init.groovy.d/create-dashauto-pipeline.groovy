import jenkins.model.Jenkins
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition
import hudson.plugins.git.BranchSpec
import hudson.plugins.git.GitSCM
import hudson.plugins.git.UserRemoteConfig

def gitUrl = System.getenv('JENKINS_GIT_URL') ?: 'https://github.com/TranThaoNguyen13/dashauto-server.git'
def jobName = 'dashauto-server'

Jenkins jenkins = Jenkins.instance

def existing = jenkins.getItem(jobName)
if (existing != null) {
  def defn = existing.getDefinition()
  if (defn != null && defn.getClass().getName().contains('CpsFlowDefinition')) {
    try {
      if (defn.getScript()?.trim()) {
        println "Job '${jobName}' da co pipeline script — skip."
        return
      }
    } catch (ignored) {
      // CpsScmFlowDefinition — khong co getScript(), ok
      println "Job '${jobName}' da ton tai (SCM) — skip."
      return
    }
    println "Job '${jobName}' pipeline trong — se tao lai..."
    existing.delete()
  } else if (existing != null) {
    println "Job '${jobName}' da ton tai — skip."
    return
  }
}

println "Creating pipeline job '${jobName}' → ${gitUrl}"

def job = jenkins.createProject(WorkflowJob.class, jobName)
def scm = new GitSCM([
  new UserRemoteConfig(gitUrl, 'origin', null, null)
])
scm.branches = [new BranchSpec('*/main')]

def definition = new CpsScmFlowDefinition(scm, 'Jenkinsfile')
definition.lightweight = true
job.definition = definition
job.description = 'DashAuto CI — chạy khi push Git (webhook hoặc poll SCM)'
job.save()

println "Job '${jobName}' created. Mở Jenkins → Build Now hoặc push lên main."
