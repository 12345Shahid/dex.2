import { Navbar } from "@/components/ui/navbar";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container py-12 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">About Us</h1>

        {/* About Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <div className="prose max-w-none">
            <p className="text-lg">
              Halal AI Chat is the world's first AI assistant designed specifically for
              the Muslim community, providing ethically filtered AI responses that align with 
              Islamic principles. Our platform combines cutting-edge AI technology with
              careful content moderation to ensure that all interactions remain halal and
              beneficial. We aim to make advanced AI accessible to everyone while maintaining
              the highest standards of Islamic ethics and values.
            </p>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Our Unique Pricing Model</h2>
          <div className="prose max-w-none">
            <p className="mb-4">Pricings Yet we don't follow traditional pricing system. In our case you will share our website and get credits. You can use those credits to generate content. the process is explained below with a real life example.</p>
            
            <p className="mb-4">suppose there are two users user1 and user2. Now the user1 shared our website using his unique link to the user2. In case user1 will get the link at his dashboard and it will be unique for every user. Now user1 will automatically get one credit because one user signed up or I should say registered using his link. And it will be showed in the referral credits earned section in the dashboard. Now if user2 earns any credit by sharing our website or by watching ads then the user1 will get the same amount of credit automatically. For example suppose user2 shared our website to five people and got five credits then user1 will get five credits automatically without doing anything because the user2 came from the reference of the user1 or I should say the referral link of user1. And it will be automatically added in the available credits section in the dashboard of the user1. One credit is enough for generating one content from any of the tool or I should say it is for one token. Using one credit user can have one blog or one research  in simple terms he can have one output from any tool  as the user wish.</p>
            
            <p className="mb-4">As it is very simple to share our website using your unique link so you can get unlimited credits and generate unlimited content daily.</p>
            
            <p>Our final goal is to create a community of Halal content creators, to help you for getting some Halal information and to help you build something Halal. So keep supporting us by sharing our website as much as you can.</p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <div className="prose max-w-none">
            <p className="text-lg">
              If you have any questions, feedback, or are facing any issues with our platform, 
              we'd love to hear from you. Please don't hesitate to reach out via email. 
              We also welcome suggestions for improvements to make our service better for the community.
            </p>
            
            <div className="mt-4 p-4 bg-primary/5 rounded-lg text-center">
              <p className="font-medium">Email us at:</p>
              <a 
                href="mailto:create.contact.369@gmail.com" 
                className="text-primary font-mono hover:underline"
              >
                create.contact.369@gmail.com
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-4 md:px-6 lg:px-8">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Halal AI Chat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 